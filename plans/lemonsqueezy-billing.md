# PromptCard Lemon Squeezy Billing Plan

## 1. Commercial model

| Offer | Price | Credits | Unit price | Displayed saving |
|---|---:|---:|---:|---:|
| Starter top-up | $5 one-time | 20 | $0.25 | Baseline |
| Creator top-up | $10 one-time | 50 | $0.20 | 20% |
| Pro top-up | $20 one-time | 150 | ~$0.1333 | ~47% |
| Monthly membership | $49.90/month | 800 per billing period | ~$0.0624 | 75% vs. Starter |

The monthly plan is limited by both conditions: 800 subscription credits and the current paid billing period. Unused subscription credits expire at the period boundary and reset to 800 only after a successful renewal payment. They do not roll over. One-time credits do not expire.

Consumption order: expiring monthly credits first, then permanent one-time credits, then any remaining free credits only if needed. This prevents paid expiring value from being wasted. The API will expose each bucket and a combined total.

## 2. Lemon Squeezy test-mode catalog

Create two products in test mode:

1. **PromptCard Credit Packs** with three one-time variants:
   - 20 Credits — $5
   - 50 Credits — $10
   - 150 Credits — $20
2. **PromptCard Monthly 800** with one monthly subscription variant:
   - 800 Credits / Month — $49.90 recurring monthly

Record the test `store_id` and four test `variant_id` values as server-only environment variables. Create a webhook pointing to `https://api.promptcard.umutdogan.space/v1/billing/webhook/lemonsqueezy` and subscribe at minimum to:

- `order_created`
- `order_refunded`
- `subscription_created`
- `subscription_updated`
- `subscription_payment_success`
- `subscription_payment_failed`
- `subscription_cancelled`
- `subscription_resumed`
- `subscription_expired`

Use a long random webhook signing secret. Keep the API key, signing secret, store ID, and variant IDs only on the backend. The extension must never contain Lemon Squeezy secrets.

## 3. Checkout flow

The signed-in extension calls `POST /v1/billing/checkout` with an authenticated Supabase bearer token and a server-known offer key such as `credits_20`, `credits_50`, `credits_100`, or `monthly_300`. The legacy `credits_100` and `monthly_300` keys are intentionally retained for compatibility, but they map to the 150-credit pack and Monthly 800 subscription respectively.

The backend:

1. Validates the Supabase session.
2. Maps the offer key to an allow-listed Lemon Squeezy variant; it never trusts a client-provided price or credit count.
3. Creates a test-mode checkout using the Lemon Squeezy API.
4. Prefills the authenticated email where appropriate.
5. Adds the Supabase user UUID and offer key to checkout `custom_data`.
6. Returns only the generated checkout URL.

The extension opens that hosted URL in a new browser tab. Hosted checkout is preferred over an in-extension overlay because extension CSP and popup lifecycle can interrupt third-party overlays. The extension then shows “Payment pending” and polls `GET /v1/billing/status` with bounded backoff, while also offering a manual refresh button.

A successful checkout redirect is not proof of payment. Credits are granted only by a valid, signed webhook.

## 4. Data model

Replace the single ambiguous balance with explicit ledger-backed buckets while preserving compatibility during migration.

### `promptcard_credit_accounts`

- `user_id uuid primary key`
- `free_credits integer not null default 0`
- `purchased_credits integer not null default 0`
- `subscription_credits integer not null default 0`
- `subscription_status text`
- `subscription_period_start timestamptz`
- `subscription_period_end timestamptz`
- `lemon_customer_id text`
- `lemon_subscription_id text unique`
- `updated_at timestamptz`

### `promptcard_credit_ledger`

Append-only audit records:

- unique `id`
- `user_id`
- `bucket` (`free`, `purchased`, `subscription`)
- signed `amount`
- `reason` (`initial_grant`, `purchase`, `renewal_reset`, `analysis`, `restore`, `refund`, `expiration`, `admin_adjustment`)
- Lemon Squeezy object/event references
- request/analysis correlation ID
- `created_at`

### `promptcard_billing_events`

- unique Lemon Squeezy event ID
- event name
- payload hash and optional JSON payload
- processing status/error
- processed timestamp

The unique event ID makes webhook retries idempotent. Ledger uniqueness constraints on Lemon order/payment identifiers provide a second idempotency layer.

## 5. Credit state machine

### One-time orders

On a valid paid `order_created` event for an allow-listed one-time variant, atomically append a purchase ledger entry and increment permanent purchased credits by 20, 50, or 150.

On a full refund, atomically create a reversing ledger entry. If already-consumed credits make a strict reversal impossible, allow the purchased bucket to become a debt or clamp usage until the debt is recovered; do not silently leave refunded credits usable. The recommended policy is a non-positive paid balance that blocks future built-in usage until repaid.

### Monthly subscription

- Initial successful subscription payment: set the paid period timestamps and set the subscription bucket to exactly 800.
- Every `subscription_payment_success`: atomically reset the subscription bucket to exactly 800 and advance period timestamps. Do not add 800 to leftovers.
- Cancellation: retain remaining subscription credits through `ends_at`; mark the subscription as cancelling.
- Resume: restore active state without adding credits.
- Failed payment: do not reset credits. Reflect past-due status and follow Lemon Squeezy’s effective access dates.
- Expiration: set subscription credits to zero after the paid period ends.

The monthly benefit text should say: “800 credits each month, 75% lower cost per analysis than the 20-credit pack. Credits reset every billing month and do not roll over.”

## 6. API changes

Extend `GET /v1/credits` to return:

- `total_remaining`
- `free_remaining`
- `purchased_remaining`
- `subscription_remaining`
- `subscription_status`
- `subscription_period_end`
- `can_purchase`

Add:

- `GET /v1/billing/offers` — public display metadata generated from server configuration.
- `POST /v1/billing/checkout` — authenticated checkout creation.
- `GET /v1/billing/status` — authenticated latest balance/payment state.
- `POST /v1/billing/webhook/lemonsqueezy` — raw-body webhook verification and processing.
- `GET /v1/billing/portal` or customer-portal URL endpoint for subscription cancellation/payment management.

Update analysis consumption to use a single database transaction/function that picks the appropriate bucket, writes the ledger, and returns the expanded balance. Restoration must restore the same bucket consumed by that analysis correlation ID.

## 7. Extension UX

In the built-in service panel, retain the current credit card and add a purchase area that is hidden while credits remain and automatically appears at zero. Also provide a smaller “Buy more credits” link before zero so users can top up proactively.

The zero-state includes:

- Heading: “Built-in credits exhausted”
- Explanation that Custom API remains available
- Three one-time package cards
- One highlighted monthly membership card
- Saving badges: the 50 pack shows “Save 20%”, the 150 pack shows “Save 47%”, and monthly shows “Best value · Save 75%”
- Checkout buttons
- Payment-pending state
- Refresh purchase status button
- “Manage subscription” button for subscribed users

All existing supported UI languages should receive translations. The credit summary should distinguish monthly credits and permanent purchased credits, and show the monthly reset date.

When `/v1/analyze` returns HTTP 402, background/content flows should trigger or direct the user to the built-in panel’s purchase section instead of only reporting an error.

## 8. Security and reliability

- Capture the exact raw webhook body before JSON parsing.
- Verify Lemon Squeezy’s HMAC signature with constant-time comparison.
- Reject unknown variants, stores, currencies, test/live mode mismatches, and missing user mapping.
- Never grant credits from frontend callbacks, redirect query parameters, or client assertions.
- Process webhook and balance mutation in one database transaction.
- Return HTTP 2xx only after successful processing or confirmed idempotent replay; return retryable errors otherwise.
- Rate-limit checkout creation and status polling.
- Log correlation IDs without logging auth tokens, API keys, webhook secrets, or full sensitive checkout payloads.
- Keep a dead-letter/error state in billing events for manual replay.
- Back up the database and deployment files before migration.

## 9. Test plan

1. Migrate an existing user and verify their current free balance is unchanged.
2. Buy every one-time variant with Lemon Squeezy test cards; verify exact one-time grants.
3. Replay each webhook and verify no duplicate credits.
4. Deliver events out of order and verify state remains correct.
5. Test invalid signatures, unknown variants, wrong store, and malformed custom data.
6. Test successful initial subscription, successful renewal reset, cancellation grace period, resume, failed payment, and expiration.
7. Test partial consumption before renewal and confirm reset is exactly 800.
8. Test refund before and after credits have been consumed.
9. Test analysis failure restoration returns the consumed credit to its original bucket.
10. Test popup closure during checkout and later status recovery.
11. Test all translations and responsive popup/side-panel presentation.
12. Confirm existing Custom API operation is unaffected.

## 10. Go-live sequence

1. Complete all test-mode scenarios.
2. Obtain Lemon Squeezy store approval.
3. Recreate/publish equivalent live variants; test IDs cannot be reused as live IDs.
4. Create a separate live webhook and secret.
5. Replace backend environment variables with live store/variant IDs and live API credentials.
6. Keep a backend `LEMONSQUEEZY_TEST_MODE` guard to prevent mixed-mode grants.
7. Run one low-risk real transaction and one refund.
8. Monitor webhook failures and ledger reconciliation before announcing billing.

## 11. Implementation order

1. Add SQL migration, ledger, idempotent event table, and transactional credit functions.
2. Refactor the backend to support raw webhook bodies and expanded credit responses.
3. Add checkout, status, portal, and webhook endpoints.
4. Add extension purchase cards, localized text, exhausted-state behavior, and polling.
5. Add test-mode environment configuration and create Lemon Squeezy products/variants/webhook.
6. Deploy backend, migrate the database, package the extension, and execute the test matrix.
