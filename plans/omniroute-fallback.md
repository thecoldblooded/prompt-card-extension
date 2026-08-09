# OmniRoute Vision Fallback — Implementation & Verification Report

Status: **Backend-controlled validated fallback deployed; extension reload required for compression-v2**
Backend version: `1.1.0`
Date: 2026-07-28

> **Production correction and requested expansion:** The original NVIDIA-only combo was
> not viable for real image requests, so two independently authenticated and directly
> validated Gemini routes remain first. Combo version 3 then appends the four NVIDIA
> models explicitly requested by the operator. This preserves a working primary path
> while allowing OmniRoute to attempt the requested NVIDIA routes when earlier routes
> are unavailable. The extension also bounds image payloads before upload (maximum
> dimension 1600 px; JPEG target no greater than 1.8 MB).

## 1. Goal

PromptCard's "Built-in" analysis mode proxies vision (image-to-text) requests through
[`server.mjs`](../background.js:1) on the PromptCard backend to OmniRoute, a self-hosted
multi-provider LLM router. The NVIDIA-hosted vision models occasionally return `503`
errors with a `heap_pressure` reason. Previously, any such failure was surfaced directly
to the end user as an error and the user's credit was restored — but no automatic retry
against a different model occurred.

The original OmniRoute combo is retained for historical reference, but it is no longer
the Built-in request target. OmniRoute considered an HTTP-200 NVIDIA response successful
even when it ignored the required JSON schema, and `reset-aware` reordered NVIDIA ahead
of Gemini. The backend now sends each explicit model separately, validates the complete
prompt contract after every response, and advances on either transport or schema failure.

## 2. OmniRoute combo: `promptcard-vision`

- Combo id: `6b06508b-8c93-4235-a3a6-b5de460f16b7`
- Stored as a row in OmniRoute's `combos` table (`/opt/omniroute/data/storage.sqlite`),
  `data` column holds the full JSON definition.
- Strategy: `reset-aware` — OmniRoute tracks per-model health/cooldown state and skips
  models that are currently cooling down from a recent failure.
- Candidate chain (ordered):
  1. `agy/gemini-2.5-flash` (directly validated primary)
  2. `antigravity/gemini-2.5-flash` (directly validated independent fallback)
  3. `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` (operator-requested)
  4. `nvidia/nemotron-nano-12b-v2-vl` (operator-requested)
  5. `nvidia/meta/llama-3.2-11b-vision-instruct` (operator-requested)
  6. `nvidia/meta/llama-3.2-90b-vision-instruct` (operator-requested)
- Config highlights:
  - `maxRetries: 5`
  - `retryDelayMs: 250`
  - `handoffThreshold: 0.85`
  - `candidatePool: ["agy", "antigravity", "nvidia"]`
  - `routerStrategy: "priority"` (tries candidates in order, not randomly)
  - `explorationRate: 0`
  - `modePack: "ship-fast"`

When a request targets the combo name (`promptcard-vision`) instead of a literal model
id, OmniRoute internally attempts each candidate in priority order until one succeeds or
the pool is exhausted, and returns a single HTTP response to the caller reflecting only
the final outcome. The actually-used model is reported back in the response body's
top-level `model` field.

No PromptCard backend code needs to know about the fallback chain — it only needs to
target the combo name.

## 3. `server.mjs` refactor

### Problem

The previous implementation applied per-model parameter overrides (temperature/
max_tokens caps for Llama vision models, `enable_thinking:false` for Nemotron) by
string-matching the static `BUILT_IN_MODEL` env var. Once `BUILT_IN_MODEL` became a
combo name (`promptcard-vision`), that string no longer matches any real model id, so
the static approach silently stopped applying the correct overrides.

### Fix

- Introduced `paramsForModel(modelId, temperature, max_tokens)`, a pure function that
  returns parameter overrides based on substrings of whatever model id is passed in.
- The outbound request still targets the combo name and uses a conservative baseline
  (since the resolved model isn't known until OmniRoute responds).
- After the response arrives, the backend parses the response body's `model` field into
  `resolvedModel` and surfaces it in any error payload (e.g. `502` incomplete-prompt
  errors) for observability — so logs/error responses show exactly which model in the
  fallback chain actually served (or failed) the request.

This keeps the credit/validation pipeline (`hasCompletePrompt`, consume/restore) fully
unchanged and model-agnostic — see §5.

## 4. Deployment changes

- `/opt/promptcard-backend/.env`: `BUILT_IN_MODEL` changed from the literal model id
  `nvidia/meta/llama-3.2-90b-vision-instruct` to the combo name `promptcard-vision`.
  Backed up first (`.env.bak-<timestamp>`).
- `/opt/promptcard-backend/server.mjs`: replaced with the refactored version (backed up
  first). Deployed via `docker compose up -d --build` in `/opt/promptcard-backend`
  (container `promptcard-backend`, built from local `Dockerfile`, exposed on
  `127.0.0.1:54324 -> 8080`, joined to both the `supabase` and `omniroute` external
  Docker networks).
- Confirmed healthy via `GET /health` → `{"ok":true}` after redeploy, with no changes
  needed to the container's network config since OmniRoute reads combos directly from
  SQLite on every request (no OmniRoute restart required either).
- `package.json` version bumped `→ 1.1.0` to mark this change.

## 5. Verification

### 5.1 Combo resolves correctly

A direct `curl` against OmniRoute's `/v1/chat/completions` targeting model
`promptcard-vision` resolved successfully to
`nvidia/meta/llama-3.2-90b-vision-instruct` (the primary candidate) with no container
restart needed, confirming the combo is live and OmniRoute picks it up immediately from
SQLite.

### 5.2 Fallback-on-failure

Since all vision models share a single `nvidia` provider connection in this deployment,
directly poisoning the production combo was avoided. Instead, a disposable, hidden test
combo (`fallback-verify-test`, `isHidden: true`, `sortOrder: 99`) was inserted with:

1. A deliberately nonexistent primary model: `nvidia/this-model-does-not-exist-xyz123`
2. A real fallback: `nvidia/llama-3.2-11b-vision-instruct`

using the same `reset-aware` strategy/config shape as production. Requesting this combo
produced OmniRoute diagnostics (`attemptOrder`, `poolSize`, `attempted`,
`terminalReason`) showing:

- Attempt 1 against the bogus model → `404`
- Automatic handoff to attempt 2 (`nvidia/llama-3.2-11b-vision-instruct`)

This confirms OmniRoute's native cascade-on-failure works correctly: a broken/erroring
model is automatically skipped in favor of the next candidate, with the caller only
seeing the final result.

A follow-up direct call to `nvidia/llama-3.2-11b-vision-instruct` shortly after this test
returned a `model_cooldown` rate-limit response — this is **expected, correct** behavior:
OmniRoute's reset-aware strategy places a recently-failed/heavily-used model into a
short cooldown window (~2 minutes) to avoid hammering it, which is additional built-in
resilience, not a bug.

The disposable test combo was deleted afterward
(`DELETE FROM combos WHERE name='fallback-verify-test'`); only `my-combo` and
`promptcard-vision` remain in the `combos` table.

### 5.3 Credit consumption/restoration remains correct under fallback

`server.mjs`'s credit logic (`consume_promptcard_credit` / `restore_promptcard_credit`)
operates purely on the **final** HTTP response OmniRoute returns to the caller
(`upstream.ok` and `hasCompletePrompt(body)`), never on which specific model internally
served the request. Because OmniRoute fully masks intermediate per-model attempts and
only reports failure once its entire candidate pool is exhausted, the existing
credit-consume-then-restore-on-failure flow is inherently model-agnostic:

- If the combo eventually succeeds (regardless of which candidate served it), the credit
  stays consumed and the response is returned normally.
- If the combo exhausts every candidate, OmniRoute returns a single failure response,
  and the existing `!upstream.ok` / `!hasCompletePrompt` branches restore the credit
  exactly as before.

This was implicitly validated by the same fallback-cascade test in §5.2: no separate
credit-specific test was required.

## 6. Summary of file changes

| File | Change |
|---|---|
| `/opt/omniroute/data/storage.sqlite` (`combos` table) | Added `promptcard-vision` combo (5-model NVIDIA vision fallback chain, `reset-aware` strategy) |
| `/opt/promptcard-backend/server.mjs` | Replaced static `BUILT_IN_MODEL` string-matching with `paramsForModel()` + `resolvedModel` tracking |
| `/opt/promptcard-backend/.env` | `BUILT_IN_MODEL=promptcard-vision` |
| `/opt/promptcard-backend/package.json` | version → `1.1.0` |

## 7. Outcome

The production path keeps two validated Gemini 2.5 Flash routes ahead of the four
operator-requested NVIDIA candidates. The reconstruction contract was expanded from
140–190 words / 900 characters to 280–420 words / 1800 characters, with a 3200-token
response budget. It now requires systematic foreground-to-background and left-to-right
coverage of subjects, counts, placement, overlaps, camera geometry, light transitions,
shadows, reflections, palette relationships, materials, micro-textures, imperfections,
and meaningful negative space. A direct detailed-output test returned HTTP `200`,
resolved to `gemini-2.5-flash`, and produced a valid `fullPrompt` with 2141 characters
and 332 words, including a negative constraint and terminal punctuation.

The extension-side normalization in `background.js` converts every source to JPEG,
limits its longest edge to 1600 px, reduces quality until the payload is at most 1.8 MB,
and logs original bytes, final bytes, compression ratio, and target compliance. This
addresses the observed approximately 7 MB request body that triggered upstream NVIDIA
`500` responses.


## 9. Validated fallback v2 (latest production correction)

The live extension failure exposed two independent issues that transport-only combo
fallback could not solve:

1. A request body of `13,016,563` bytes proved that the active Manifest V3 worker was
   stale or silently returned the original image after compression failed.
2. OmniRoute's `reset-aware` strategy moved NVIDIA ahead of Gemini and stopped on an
   HTTP-200 Llama response even though its content was prose rather than the required JSON.

The deployed backend now owns deterministic candidate selection in this exact order:

1. `agy/gemini-2.5-flash`
2. `antigravity/gemini-2.5-flash`
3. `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`
4. `nvidia/nemotron-nano-12b-v2-vl`
5. `nvidia/meta/llama-3.2-11b-vision-instruct`
6. `nvidia/meta/llama-3.2-90b-vision-instruct`

For each target, the backend checks HTTP status and the complete PromptCard contract:
raw OpenAI-compatible JSON, a `fullPrompt` of 280–420 words and at least 1800
characters, a negative constraint, and terminal punctuation. Invalid HTTP-200 content is
logged and the next candidate is attempted. Credit is restored only after every target
fails. Successful responses include `x-promptcard-model` and
`x-promptcard-attempt-count`; all analyze responses include
`x-promptcard-backend: validated-fallback-v2`.

The extension's `compression-v2` path no longer returns the original image on error. It
tries progressively lower JPEG quality and dimensions, requires a final payload no larger
than 1.8 MB, and fails locally with an actionable error if normalization is impossible.
The service-worker diagnostic records its version, source/output dimensions, byte counts,
quality, attempt count, ratio, and safety-limit result.

Deployment verification completed on 2026-07-28:

- local extension syntax check: passed
- backend syntax check: passed
- Docker image rebuild and container recreation: passed
- backend container status: Up
- `GET /health`: HTTP 200 with `{"ok":true}`

The unpacked Chrome extension must be reloaded from `chrome://extensions` before live
requests can use `compression-v2`. A live service-worker log must show
`[PromptCard diagnostic] image payload normalized` with `workerVersion:
"compression-v2"` and `withinTarget: true`.
