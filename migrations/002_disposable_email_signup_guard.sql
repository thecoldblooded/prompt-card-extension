begin;

create table if not exists public.disposable_email_domains (
  domain text primary key
    check (char_length(domain) between 3 and 253)
    check (domain = lower(btrim(domain)))
    check (domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'),
  synced_at timestamptz not null default now()
);

alter table public.disposable_email_domains enable row level security;
revoke all on public.disposable_email_domains from public, anon, authenticated;
grant select on public.disposable_email_domains to supabase_auth_admin;

create or replace function public.hook_reject_disposable_email(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_domain text;
  candidate_domain text;
begin
  if event->'user'->'app_metadata'->>'provider' is distinct from 'email' then
    return '{}'::jsonb;
  end if;

  email_domain := lower(btrim(split_part(event->'user'->>'email', '@', 2)));
  if email_domain is null or email_domain = '' then
    return '{}'::jsonb;
  end if;

  candidate_domain := email_domain;
  loop
    if exists (
      select 1
      from public.disposable_email_domains
      where domain = candidate_domain
    ) then
      return jsonb_build_object(
        'error', jsonb_build_object(
          'http_code', 403,
          'message', 'Disposable email addresses are not allowed. Please use a permanent email address.'
        )
      );
    end if;

    candidate_domain := substr(candidate_domain, strpos(candidate_domain, '.') + 1);
    exit when strpos(candidate_domain, '.') = 0;
  end loop;

  return '{}'::jsonb;
end;
$$;

revoke all on function public.hook_reject_disposable_email(jsonb) from public, anon, authenticated;
grant execute on function public.hook_reject_disposable_email(jsonb) to supabase_auth_admin;

commit;
