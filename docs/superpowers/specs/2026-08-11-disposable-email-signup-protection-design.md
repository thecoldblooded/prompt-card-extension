# Disposable Email Signup Protection Design

## Objective

Reject new PromptCard accounts created through email OTP when the submitted address belongs to a known disposable-email service. Google OAuth registrations and all existing users remain unaffected.

The protection must run at the Supabase Auth trust boundary. A browser-only check is insufficient because clients can call `/auth/v1/otp` directly.

## Current Flow

`popup.js` sends email registration requests directly to Supabase Auth:

```text
Extension -> POST /auth/v1/otp { email, create_user: true } -> Supabase Auth
```

The deployed Auth image is `supabase/gotrue:v2.189.0`, which supports the `BeforeUserCreated` extensibility point. The popup already surfaces Supabase's `msg`, `error_description`, or `message` response, so a rejected signup requires no duplicate client-side enforcement.

## Scope

### Included

- New accounts created with the `email` provider.
- Exact disposable domains and subdomains of blocked domains.
- A self-hosted domain list stored in PostgreSQL.
- Weekly, atomic list refresh from the CC0 `disposable-email-domains` dataset.
- A user-facing rejection message from Supabase Auth.
- Verification and rollback of the deployed hook.

### Excluded

- Google OAuth registrations.
- Existing users, including existing users whose domain later enters the blocklist.
- SMTP mailbox probing, domain-age heuristics, and paid validation APIs.
- Retroactive deletion or suspension of accounts.
- A claim of perfect detection: a newly created disposable domain can pass until the source dataset learns it.

## Data Source

Use [`disposable-email-domains/disposable-email-domains`](https://github.com/disposable-email-domains/disposable-email-domains), specifically `disposable_email_blocklist.conf`.

The dataset is CC0, permits commercial use, validates entries against public-suffix rules, and is used by systems including PyPI. PromptCard does not send user addresses to the dataset provider. Only the public domain list is downloaded by the server.

## Database Design

Add migration `migrations/002_disposable_email_signup_guard.sql` with:

```text
public.disposable_email_domains
  domain text primary key
  synced_at timestamptz not null
```

Requirements:

- Normalize every stored domain to lowercase and remove surrounding whitespace.
- Reject empty or malformed rows during synchronization.
- Revoke access from `anon`, `authenticated`, and `public`.
- Grant only the minimum `SELECT` permission required by `supabase_auth_admin`.
- Do not store full user email addresses or lookup logs.

The same migration defines `public.hook_reject_disposable_email(event jsonb) returns jsonb` and grants execution only to `supabase_auth_admin`.

## Auth Hook Behavior

Configure the Auth service with:

```text
GOTRUE_HOOK_BEFORE_USER_CREATED_ENABLED=true
GOTRUE_HOOK_BEFORE_USER_CREATED_URI=pg-functions://postgres/public/hook_reject_disposable_email
```

The function executes this policy:

1. Read `event.user.app_metadata.provider`.
2. If the provider is not exactly `email`, return `{}` and allow creation.
3. Normalize `event.user.email` and extract its domain.
4. Check the full domain and each parent suffix, stopping before the top-level suffix. For example, `inbox.a.temp.example` checks `inbox.a.temp.example`, `a.temp.example`, and `temp.example`.
5. If any candidate exists in `public.disposable_email_domains`, return:

```json
{
  "error": {
    "http_code": 403,
    "message": "Disposable email addresses are not allowed. Please use a permanent email address."
  }
}
```

6. Otherwise return `{}`.

The lookup uses indexed exact comparisons for each candidate suffix. The hook makes no network request and therefore does not make registration dependent on GitHub or another API.

## Domain Synchronization

Add `scripts/sync-disposable-email-domains.sh` and install it on the Supabase host. The script runs every Sunday at 04:23 UTC.

Synchronization steps:

1. Download `https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf` over HTTPS to a temporary file.
2. Normalize, sort, and deduplicate entries.
3. Validate that every row is lowercase ASCII, is at most 253 characters, contains at least two nonempty dot-separated labels, contains only letters, digits, dots, and hyphens, has no label longer than 63 characters, and does not begin or end a label with a hyphen. Require at least 1,000 unique entries. These checks prevent malformed, empty, or truncated downloads from replacing the current data.
4. Load the result into a temporary PostgreSQL staging table.
5. In one transaction, replace the production table contents with the validated staging contents and set `synced_at` to the transaction time.
6. Remove temporary files.

If download, validation, or loading fails, the script exits nonzero and leaves the last known-good production table unchanged. User email addresses are never sent during synchronization.

The initial deployment runs the synchronization once before enabling the Auth hook. This prevents a hook from starting against an empty table.

## Deployment Ownership

The active Supabase stack currently runs from `/opt/supabase`. Apply and verify the migration and Auth environment settings there. Mirror the same Auth settings and synchronization asset into the Dokploy compose source before any future ownership cutover so a Dokploy redeploy cannot silently remove the policy.

Only the Auth container needs recreation after the environment change. The database and unrelated services must remain running.

## User Experience

When a disposable address is submitted, `/auth/v1/otp` returns the hook's 403 message. Existing `popup.js` error handling displays that message and does not reveal the OTP input.

A permanent address follows the current OTP flow unchanged. Google authentication follows the current OAuth flow unchanged.

No client-side domain list is shipped in the extension: it would enlarge the package, become stale between releases, and be bypassable.

## Failure Behavior

- Dataset host unavailable: keep the last known-good list; registration continues against it.
- Malformed or suspiciously small dataset: reject the refresh; keep the previous list.
- PostgreSQL unavailable: Auth is already unavailable, so there is no separate fallback path.
- False positive: remove the domain from the local table immediately and submit an upstream removal request; the next successful full synchronization may restore it until upstream accepts the correction, so an explicit local allowlist is not introduced initially. If the first real false positive occurs, add a small allowlist checked before the blocklist.
- Newly created unknown disposable domain: allow until detected by the source list. This is the accepted limitation of the self-hosted blocklist design.

## Verification

Before enabling the hook, record the current `auth.users` count and confirm existing health endpoints.

Verify these observable contracts:

1. Direct function call with provider `email` and a known blocked domain returns the 403 error object.
2. Direct function call with provider `google` and the same domain returns `{}`.
3. Direct function call with a subdomain of a blocked domain returns the 403 error object.
4. Direct function call with a permanent public provider returns `{}`.
5. `POST /auth/v1/otp` for a known disposable address returns 403, sends no OTP, and does not change `auth.users`.
6. `POST /auth/v1/otp` for a controlled permanent test address succeeds through the existing OTP-send path; remove the test account afterward if one was created.
7. An existing account can still request and verify an OTP.
8. Google authorization still produces the configured OAuth redirect.
9. A deliberately invalid synchronization input exits nonzero and preserves the current table count and a known blocked row.
10. A valid synchronization completes atomically and leaves at least 1,000 indexed domains.

After verification, confirm Supabase Auth health, PromptCard backend health, and the extension's email-registration error rendering.

## Rollback

Set `GOTRUE_HOOK_BEFORE_USER_CREATED_ENABLED=false` and recreate only the Auth container. The function and table may remain inert for investigation, or the migration can be reversed later. Rollback does not modify `auth.users`, sessions, credits, billing data, or storage.

## References

- [Supabase Before User Created Hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook)
- [Supabase Auth hook error handling](https://supabase.com/docs/guides/auth/auth-hooks#error-handling)
- [Disposable email domains CC0 dataset](https://github.com/disposable-email-domains/disposable-email-domains)
- [Supabase Auth v2.189.0 hook configuration source](https://github.com/supabase/auth/blob/v2.189.0/internal/conf/configuration.go)
