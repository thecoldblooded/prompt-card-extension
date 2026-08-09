begin;

create extension if not exists pgcrypto;

create table if not exists public.promptcard_credit_accounts (
  user_id uuid primary key,
  free_credits integer not null default 5 check (free_credits >= 0),
  purchased_credits integer not null default 0,
  subscription_credits integer not null default 0 check (subscription_credits >= 0),
  subscription_status text,
  subscription_period_start timestamptz,
  subscription_period_end timestamptz,
  lemon_customer_id text,
  lemon_subscription_id text unique,
  updated_at timestamptz not null default now()
);

insert into public.promptcard_credit_accounts (user_id, free_credits)
select user_id, greatest(coalesce(remaining_uses, 5), 5)
from public.promptcard_credits
on conflict (user_id) do nothing;

create table if not exists public.promptcard_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  bucket text not null check (bucket in ('free', 'purchased', 'subscription')),
  amount integer not null check (amount <> 0),
  reason text not null,
  external_reference text,
  analysis_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists promptcard_credit_ledger_external_unique
  on public.promptcard_credit_ledger (external_reference)
  where external_reference is not null;
create unique index if not exists promptcard_credit_ledger_analysis_debit_unique
  on public.promptcard_credit_ledger (analysis_id)
  where analysis_id is not null and reason = 'analysis';
create unique index if not exists promptcard_credit_ledger_analysis_restore_unique
  on public.promptcard_credit_ledger (analysis_id)
  where analysis_id is not null and reason = 'restore';
create index if not exists promptcard_credit_ledger_user_created_idx
  on public.promptcard_credit_ledger (user_id, created_at desc);

create table if not exists public.promptcard_billing_events (
  event_id text primary key,
  event_name text not null,
  payload_hash text not null,
  payload jsonb not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'ignored', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.promptcard_credit_accounts enable row level security;
alter table public.promptcard_credit_ledger enable row level security;
alter table public.promptcard_billing_events enable row level security;
revoke all on public.promptcard_credit_accounts from anon, authenticated;
revoke all on public.promptcard_credit_ledger from anon, authenticated;
revoke all on public.promptcard_billing_events from anon, authenticated;

create or replace function public.promptcard_credit_snapshot(p_user_id uuid)
returns table (
  total_remaining integer,
  free_remaining integer,
  purchased_remaining integer,
  subscription_remaining integer,
  subscription_status text,
  subscription_period_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.promptcard_credit_accounts%rowtype;
begin
  insert into public.promptcard_credit_accounts (user_id, free_credits)
  values (p_user_id, 5)
  on conflict (user_id) do nothing;

  update public.promptcard_credit_accounts as account
     set subscription_credits = 0,
         subscription_status = case when account.subscription_status in ('active', 'cancelled') then 'expired' else account.subscription_status end,
         updated_at = now()
   where account.user_id = p_user_id
     and account.subscription_period_end is not null
     and account.subscription_period_end <= now()
     and account.subscription_credits > 0;

  select * into v_account
    from public.promptcard_credit_accounts
   where user_id = p_user_id;

  return query select
    greatest(v_account.free_credits, 0) + greatest(v_account.purchased_credits, 0) + greatest(v_account.subscription_credits, 0),
    greatest(v_account.free_credits, 0),
    v_account.purchased_credits,
    greatest(v_account.subscription_credits, 0),
    v_account.subscription_status,
    v_account.subscription_period_end;
end;
$$;

create or replace function public.consume_promptcard_credit_v2(p_user_id uuid, p_analysis_id uuid)
returns table (
  consumed_bucket text,
  total_remaining integer,
  free_remaining integer,
  purchased_remaining integer,
  subscription_remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.promptcard_credit_accounts%rowtype;
  v_bucket text;
begin
  perform public.promptcard_credit_snapshot(p_user_id);
  select * into v_account from public.promptcard_credit_accounts where user_id = p_user_id for update;

  if v_account.subscription_credits > 0 and (v_account.subscription_period_end is null or v_account.subscription_period_end > now()) then
    v_bucket := 'subscription';
    update public.promptcard_credit_accounts set subscription_credits = subscription_credits - 1, updated_at = now() where user_id = p_user_id;
  elsif v_account.purchased_credits > 0 then
    v_bucket := 'purchased';
    update public.promptcard_credit_accounts set purchased_credits = purchased_credits - 1, updated_at = now() where user_id = p_user_id;
  elsif v_account.free_credits > 0 then
    v_bucket := 'free';
    update public.promptcard_credit_accounts set free_credits = free_credits - 1, updated_at = now() where user_id = p_user_id;
  else
    return;
  end if;

  insert into public.promptcard_credit_ledger (user_id, bucket, amount, reason, analysis_id)
  values (p_user_id, v_bucket, -1, 'analysis', p_analysis_id);

  return query
  select v_bucket, s.total_remaining, s.free_remaining, s.purchased_remaining, s.subscription_remaining
  from public.promptcard_credit_snapshot(p_user_id) s;
end;
$$;

create or replace function public.restore_promptcard_credit_v2(p_user_id uuid, p_analysis_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket text;
begin
  if exists (select 1 from public.promptcard_credit_ledger where analysis_id = p_analysis_id and reason = 'restore') then
    return false;
  end if;

  select bucket into v_bucket
    from public.promptcard_credit_ledger
   where user_id = p_user_id and analysis_id = p_analysis_id and reason = 'analysis'
   for update;
  if v_bucket is null then return false; end if;

  if v_bucket = 'subscription' then
    update public.promptcard_credit_accounts set subscription_credits = subscription_credits + 1, updated_at = now() where user_id = p_user_id;
  elsif v_bucket = 'purchased' then
    update public.promptcard_credit_accounts set purchased_credits = purchased_credits + 1, updated_at = now() where user_id = p_user_id;
  else
    update public.promptcard_credit_accounts set free_credits = free_credits + 1, updated_at = now() where user_id = p_user_id;
  end if;

  insert into public.promptcard_credit_ledger (user_id, bucket, amount, reason, analysis_id)
  values (p_user_id, v_bucket, 1, 'restore', p_analysis_id);
  return true;
end;
$$;

revoke all on function public.promptcard_credit_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.consume_promptcard_credit_v2(uuid, uuid) from public, anon, authenticated;
revoke all on function public.restore_promptcard_credit_v2(uuid, uuid) from public, anon, authenticated;

commit;
