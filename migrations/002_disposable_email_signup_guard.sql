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
  email_address text;
  email_domain text;
  candidate_domain text;
  reacher_res record;
  reacher_json jsonb;
  is_disposable_flag boolean;
  is_reachable_status text;
  is_catch_all_flag boolean;
  is_b2c_flag boolean;
begin
  if event->'user'->'app_metadata'->>'provider' is distinct from 'email' then
    return '{}'::jsonb;
  end if;

  email_address := lower(btrim(event->'user'->>'email'));
  email_domain := split_part(email_address, '@', 2);
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

  begin
    select status, content into reacher_res
    from public.http_post(
      'http://reacher:8080/v0/check_email',
      jsonb_build_object('to_email', email_address)::text,
      'application/json'
    );

    if reacher_res.status = 200 then
      reacher_json := reacher_res.content::jsonb;
      is_disposable_flag := coalesce((reacher_json->'misc'->>'is_disposable')::boolean, false);
      is_reachable_status := reacher_json->>'is_reachable';
      is_catch_all_flag := coalesce((reacher_json->'smtp'->>'is_catch_all')::boolean, false);
      is_b2c_flag := coalesce((reacher_json->'misc'->>'is_b2c')::boolean, false);

      if is_disposable_flag or is_reachable_status = 'invalid' or (is_reachable_status = 'risky' and is_catch_all_flag and not is_b2c_flag) then
        insert into public.disposable_email_domains (domain, synced_at)
        values (email_domain, now())
        on conflict (domain) do nothing;

        return jsonb_build_object(
          'error', jsonb_build_object(
            'http_code', 403,
            'message', 'Disposable email addresses are not allowed. Please use a permanent email address.'
          )
        );
      end if;
    end if;
  exception when others then
    null;
  end;

  return '{}'::jsonb;
end;
$$;

revoke all on function public.hook_reject_disposable_email(jsonb) from public, anon, authenticated;
grant execute on function public.hook_reject_disposable_email(jsonb) to supabase_auth_admin;

commit;
