# Disposable Email Signup Protection Implementation Plan

**Goal:** Block new email/OTP accounts using known disposable-email domains at the Supabase Auth boundary while preserving Google OAuth, existing users, and all stored data.

**Architecture:** A PostgreSQL `Before User Created` hook performs indexed lookups against a locally synchronized CC0 domain table. A weekly host-side script refreshes the table atomically. The extension remains a thin client and displays the Auth error it already receives.

**Design:** `docs/superpowers/specs/2026-08-11-disposable-email-signup-protection-design.md`

## Task 1: Add the database migration

**File:** `migrations/002_disposable_email_signup_guard.sql`

1. Create `public.disposable_email_domains` with `domain` as its primary key and `synced_at` timestamp.
2. Enable RLS, revoke public/client access, and grant only `SELECT` to `supabase_auth_admin`.
3. Create `public.hook_reject_disposable_email(jsonb)` using exact indexed suffix checks.
4. Bypass all providers except `email`.
5. Return the approved 403 error object for blocked domains and `{}` otherwise.
6. Revoke function execution from public/client roles and grant it to `supabase_auth_admin`.
7. Keep the migration idempotent and transactional.

**Focused check:** Apply the migration to the live PostgreSQL instance with `ON_ERROR_STOP=1`, then invoke the function directly for email, Google, blocked, allowed, and subdomain payloads.

## Task 2: Add the atomic synchronization script

**File:** `scripts/sync-disposable-email-domains.sh`

1. Download the approved raw CC0 list to a temporary file.
2. Normalize and validate every domain according to the design.
3. Require at least 1,000 unique domains.
4. Copy the validated file into the PostgreSQL container.
5. Load a temporary staging table and replace production rows in one transaction.
6. Keep the previous table intact on every failure path.
7. Prevent concurrent runs with a host lock and remove temporary files/container artifacts on exit.
8. Permit a source URL override only for deterministic failure testing; default to the approved upstream URL.

**Focused checks:** Run the script against an invalid local fixture and prove the production count and a known blocked row are unchanged; then run against upstream and prove a valid count is installed.

## Task 3: Commit source changes before deployment

1. Review the migration and script for secret-free content.
2. Commit and push only the migration, synchronization script, and implementation plan.
3. Do not add generated domain data or credentials to Git.

## Task 4: Back up and deploy without interrupting data services

**Live stack:** `/opt/supabase`

1. Create a fresh timestamped PostgreSQL custom-format backup on the VPS.
2. Upload the migration and script to `/opt/supabase/migrations/` and `/opt/supabase/scripts/`.
3. Mirror both files into `/etc/dokploy/applications/promptcard-supabase-app/code/` so the copied Dokploy source cannot drift.
4. Apply the migration to `supabase-db`.
5. Run the initial domain synchronization and record its row count.
6. Install root cron at Sunday 04:23 UTC.
7. Add the two `GOTRUE_HOOK_BEFORE_USER_CREATED_*` variables to the active compose file and the Dokploy compose copy.
8. Recreate only `supabase-auth`; keep PostgreSQL and every unrelated service running.

## Task 5: Verify live behavior and rollback readiness

1. Confirm Auth and PromptCard backend health before and after recreation.
2. Record `auth.users` count.
3. Submit `/auth/v1/otp` with a unique known-disposable address; require 403 and unchanged user count.
4. Submit `/auth/v1/otp` with a controlled unique permanent address; require the normal success path, then remove the test account if created.
5. Confirm direct Google authorization still returns the configured OAuth redirect.
6. Confirm an existing account path remains unaffected by the creation hook.
7. Confirm cron syntax, script permissions, table permissions, function permissions, and installed list count.
8. Verify rollback by inspecting that disabling `GOTRUE_HOOK_BEFORE_USER_CREATED_ENABLED` and recreating only Auth is sufficient; do not execute rollback unless verification fails.

## Task 6: Final cleanup

1. Remove temporary fixtures and container-side import files.
2. Preserve the fresh database backup and last known-good domain table.
3. Report exact verification evidence and any untested mailbox-dependent step without overstating completion.
