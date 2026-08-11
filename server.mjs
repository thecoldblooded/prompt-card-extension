import crypto from 'node:crypto';
import express from 'express';
import { Pool } from 'pg';

const required = ['DATABASE_URL', 'SUPABASE_INTERNAL_URL', 'SUPABASE_ANON_KEY', 'OMNIROUTE_URL', 'OMNIROUTE_API_KEY'];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const jsonParser = express.json({ limit: '12mb' });
app.use((req, res, next) => {
  if (req.path === '/v1/billing/webhook/lemonsqueezy') return next();
  return jsonParser(req, res, next);
});

const billingOffers = {
  credits_20: { name: '20 Credits', price: '$5', credits: 20, type: 'one_time', variantId: process.env.LEMON_VARIANT_CREDITS_20 },
  credits_50: { name: '50 Credits', price: '$10', credits: 50, type: 'one_time', saving: 20, variantId: process.env.LEMON_VARIANT_CREDITS_50 },
  credits_100: { name: '150 Credits', price: '$20', credits: 150, type: 'one_time', saving: 47, variantId: process.env.LEMON_VARIANT_CREDITS_100 },
  monthly_300: { name: 'Monthly 800', price: '$49.90/month', credits: 800, type: 'subscription', saving: 75, variantId: process.env.LEMON_VARIANT_MONTHLY_300 },
};
const offerByVariant = (variantId) => Object.entries(billingOffers).find(([, offer]) => String(offer.variantId) === String(variantId));
const billingConfigured = () => Boolean(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID && process.env.LEMONSQUEEZY_WEBHOOK_SECRET && Object.values(billingOffers).every((offer) => offer.variantId));

// Use explicit targets so transport success cannot hide schema-invalid output.
// Gemini routes are intentionally first; requested NVIDIA routes remain guarded
// fallbacks and are accepted only when they satisfy the same response contract.
const builtInModels = (process.env.BUILT_IN_MODELS || [
  'agy/gemini-2.5-flash',
  'antigravity/gemini-2.5-flash',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  'nvidia/nemotron-nano-12b-v2-vl',
  'nvidia/meta/llama-3.2-11b-vision-instruct',
  'nvidia/meta/llama-3.2-90b-vision-instruct',
].join(','))
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

async function userFromRequest(req) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const response = await fetch(`${process.env.SUPABASE_INTERNAL_URL}/auth/v1/user`, {
    headers: { authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_ANON_KEY },
  });
  if (!response.ok) return null;
  return response.json();
}

function extractCompletedJsonString(jsonText, propertyName) {
  const marker = `"${propertyName}"`;
  const markerIndex = jsonText.indexOf(marker);
  if (markerIndex === -1) return '';
  let i = jsonText.indexOf(':', markerIndex + marker.length);
  if (i === -1) return '';
  i += 1;
  while (i < jsonText.length && /\s/.test(jsonText[i])) i += 1;
  if (jsonText[i] !== '"') return '';
  i += 1;
  let out = '';
  while (i < jsonText.length) {
    const ch = jsonText[i];
    if (ch === '\\') {
      const next = jsonText[i + 1];
      if (next === undefined) break;
      const map = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', '/': '/' };
      out += map[next] !== undefined ? map[next] : next;
      i += 2;
      continue;
    }
    if (ch === '"') break;
    out += ch;
    i += 1;
  }
  return out;
}

function hasCompletePrompt(body) {
  try {
    const payload = JSON.parse(body);
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return false;
    const clean = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    let prompt;
    try {
      prompt = JSON.parse(clean)?.fullPrompt;
    } catch {
      prompt = extractCompletedJsonString(clean, 'fullPrompt');
    }
    const normalized = String(prompt || '').trim();
    const wordCount = normalized.split(/\s+/).filter(Boolean).length;
    const hasNegativeConstraint = /\b(?:do not|don't|without|avoid|exclude|prevent|no (?:additional|extra|unobserved|unwanted))\b/i.test(normalized);
    return normalized.length >= 1800 && wordCount >= 280 && wordCount <= 420 && hasNegativeConstraint && /[.!?…]$/.test(normalized);
  } catch {
    return false;
  }
}

// Per-model parameter overrides, keyed by substrings found in the ACTUAL model
// that OmniRoute used to serve the response (not the static BUILT_IN_MODEL env
// value, which may now be a combo name resolving to any of several models).
function paramsForModel(modelId, temperature, max_tokens) {
  const id = String(modelId || '');
  const overrides = { extra: {} };
  if (id.includes('llama-3.2-90b-vision-instruct') || id.includes('llama-3.2-11b-vision-instruct')) {
    overrides.temperature = Math.min(temperature, 0.1);
    overrides.max_tokens = Math.min(max_tokens, 3200);
  }
  if (id.includes('nemotron-3-nano') || id.includes('nemotron-nano') || id.includes('nemotron-3')) {
    overrides.extra.chat_template_kwargs = { enable_thinking: false };
  }
  return overrides;
}

app.get('/health', (_req, res) => res.json({ ok: true, billing: billingConfigured() ? 'test-ready' : 'configuration-required' }));

async function creditSnapshot(userId) {
  const result = await pool.query('select * from public.promptcard_credit_snapshot($1)', [userId]);
  return result.rows[0] || {};
}

app.get('/v1/credits', async (req, res) => {
  const user = await userFromRequest(req);
  if (!user) return res.status(401).json({ error: { message: 'Authentication required' } });
  const snapshot = await creditSnapshot(user.id);
  res.json({ ...snapshot, remaining_uses: snapshot.total_remaining, billing_configured: billingConfigured() });
});

app.get('/v1/billing/offers', (_req, res) => {
  res.json({
    test_mode: process.env.LEMONSQUEEZY_TEST_MODE !== 'false',
    configured: billingConfigured(),
    offers: Object.entries(billingOffers).map(([key, { variantId: _variantId, ...offer }]) => ({ key, ...offer })),
  });
});

app.post('/v1/billing/checkout', async (req, res) => {
  const user = await userFromRequest(req);
  if (!user) return res.status(401).json({ error: { message: 'Authentication required' } });
  if (!billingConfigured()) {
    console.warn('[PromptCard billing] checkout rejected: billing is not configured');
    return res.status(503).json({ error: { message: 'Billing test mode is not configured yet' } });
  }
  const offerKey = req.body?.offer;
  const offer = billingOffers[offerKey];
  if (!offer?.variantId) return res.status(400).json({ error: { message: 'Unknown billing offer' } });

  console.info('[PromptCard billing] creating checkout', { userId: user.id, offer: offerKey, variantId: offer.variantId });
  const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          test_mode: process.env.LEMONSQUEEZY_TEST_MODE !== 'false',
          checkout_data: { email: user.email, custom: { user_id: user.id, offer_key: req.body.offer } },
          product_options: { redirect_url: process.env.LEMONSQUEEZY_REDIRECT_URL || 'https://promptcard.hopto.org/?payment=complete' },
        },
        relationships: {
          store: { data: { type: 'stores', id: String(process.env.LEMONSQUEEZY_STORE_ID) } },
          variant: { data: { type: 'variants', id: String(offer.variantId) } },
        },
      },
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[PromptCard billing] Lemon Squeezy checkout failed', { status: response.status, offer: offerKey, detail: body.errors?.[0]?.detail });
    return res.status(502).json({ error: { message: body.errors?.[0]?.detail || 'Checkout could not be created' } });
  }
  console.info('[PromptCard billing] checkout created', { userId: user.id, offer: offerKey, checkoutId: body.data?.id });
  res.json({ checkout_url: body.data?.attributes?.url });
});

app.get('/v1/billing/status', async (req, res) => {
  const user = await userFromRequest(req);
  if (!user) return res.status(401).json({ error: { message: 'Authentication required' } });
  res.json({ ...(await creditSnapshot(user.id)), billing_configured: billingConfigured(), test_mode: process.env.LEMONSQUEEZY_TEST_MODE !== 'false' });
});

app.get('/v1/billing/portal', async (req, res) => {
  const user = await userFromRequest(req);
  if (!user) return res.status(401).json({ error: { message: 'Authentication required' } });
  const result = await pool.query('select lemon_subscription_id from public.promptcard_credit_accounts where user_id = $1', [user.id]);
  const subscriptionId = result.rows[0]?.lemon_subscription_id;
  if (!subscriptionId || !process.env.LEMONSQUEEZY_API_KEY) return res.status(404).json({ error: { message: 'No subscription found' } });
  const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`, { headers: { Accept: 'application/vnd.api+json', Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}` } });
  const body = await response.json().catch(() => ({}));
  const url = body.data?.attributes?.urls?.customer_portal;
  if (!response.ok || !url) return res.status(502).json({ error: { message: 'Customer portal is unavailable' } });
  res.json({ url });
});

app.post('/v1/billing/webhook/lemonsqueezy', express.raw({ type: 'application/json', limit: '2mb' }), async (req, res) => {
  if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET) return res.status(503).end();
  const signature = req.get('x-signature') || '';
  const expected = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET).update(req.body).digest('hex');
  const valid = signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return res.status(401).json({ error: { message: 'Invalid signature' } });

  const payload = JSON.parse(req.body.toString('utf8'));
  const eventName = payload.meta?.event_name;
  const eventId = String(payload.meta?.event_id || payload.data?.id || crypto.createHash('sha256').update(req.body).digest('hex'));
  const attributes = payload.data?.attributes || {};
  const userId = payload.meta?.custom_data?.user_id;
  const variantId = attributes.variant_id
    ?? attributes.first_order_item?.variant_id
    ?? attributes.first_subscription_item?.variant_id;
  const matched = Object.entries(billingOffers).find(([, offer]) => String(offer.variantId) === String(variantId));
  console.info('[PromptCard billing] webhook received', {
    eventName: eventName || null,
    eventId,
    variantId: variantId == null ? null : String(variantId),
    offer: matched?.[0] || null,
    hasUserId: Boolean(userId),
    testMode: attributes.test_mode === true,
  });
  const client = await pool.connect();
  try {
    await client.query('begin');
    const inserted = await client.query(`insert into public.promptcard_billing_events (event_id,event_name,payload_hash,payload) values ($1,$2,$3,$4) on conflict do nothing returning event_id`, [eventId, eventName || 'unknown', crypto.createHash('sha256').update(req.body).digest('hex'), payload]);
    if (!inserted.rowCount) { await client.query('rollback'); return res.status(200).json({ replay: true }); }
    if (!userId || !matched || (process.env.LEMONSQUEEZY_TEST_MODE !== 'false') !== Boolean(attributes.test_mode)) {
      console.warn('[PromptCard billing] webhook ignored', {
        eventName: eventName || null,
        eventId,
        variantId: variantId == null ? null : String(variantId),
        offer: matched?.[0] || null,
        hasUserId: Boolean(userId),
        testMode: attributes.test_mode === true,
      });
      await client.query(`update public.promptcard_billing_events set status='ignored', processed_at=now() where event_id=$1`, [eventId]);
      await client.query('commit');
      return res.status(200).json({ ignored: true });
    }
    const [offerKey, offer] = matched;
    await client.query('insert into public.promptcard_credit_accounts (user_id) values ($1) on conflict do nothing', [userId]);

    if (eventName === 'order_created' && offer.type === 'one_time' && attributes.status === 'paid') {
      await client.query('update public.promptcard_credit_accounts set purchased_credits=purchased_credits+$2, lemon_customer_id=coalesce($3,lemon_customer_id), updated_at=now() where user_id=$1', [userId, offer.credits, String(attributes.customer_id || '') || null]);
      await client.query(`insert into public.promptcard_credit_ledger(user_id,bucket,amount,reason,external_reference,metadata) values($1,'purchased',$2,'purchase',$3,$4)`, [userId, offer.credits, `order:${payload.data.id}`, { offer: offerKey }]);
    } else if ((eventName === 'subscription_created' || eventName === 'subscription_payment_success') && offer.type === 'subscription') {
      const subscriptionId = String(eventName === 'subscription_created' ? payload.data.id : attributes.subscription_id || payload.data.id);
      await client.query(`update public.promptcard_credit_accounts set subscription_credits=$2, subscription_status='active', subscription_period_start=coalesce($3,now()), subscription_period_end=$4, lemon_customer_id=coalesce($5,lemon_customer_id), lemon_subscription_id=$6, updated_at=now() where user_id=$1`, [userId, offer.credits, attributes.renews_at ? new Date(new Date(attributes.renews_at).getTime() - 31 * 86400000) : null, attributes.renews_at || attributes.ends_at, String(attributes.customer_id || '') || null, subscriptionId]);
      await client.query(`insert into public.promptcard_credit_ledger(user_id,bucket,amount,reason,external_reference,metadata) values($1,'subscription',$2,'renewal_reset',$3,$4)`, [userId, offer.credits, `subscription-payment:${eventId}`, { offer: offerKey }]);
    } else if (['subscription_updated', 'subscription_cancelled', 'subscription_resumed', 'subscription_payment_failed'].includes(eventName) && offer.type === 'subscription') {
      await client.query('update public.promptcard_credit_accounts set subscription_status=$2, subscription_period_end=coalesce($3,subscription_period_end), updated_at=now() where user_id=$1', [userId, attributes.status || eventName.replace('subscription_', ''), attributes.ends_at || attributes.renews_at]);
    } else if (eventName === 'subscription_expired' && offer.type === 'subscription') {
      await client.query(`update public.promptcard_credit_accounts set subscription_credits=0, subscription_status='expired', subscription_period_end=coalesce($2,now()), updated_at=now() where user_id=$1`, [userId, attributes.ends_at]);
    }
    await client.query(`update public.promptcard_billing_events set status='processed', processed_at=now() where event_id=$1`, [eventId]);
    await client.query('commit');
    res.json({ ok: true });
  } catch (error) {
    await client.query('rollback');
    console.error('[PromptCard billing] webhook failed', eventId, error);
    res.status(500).json({ error: { message: 'Webhook processing failed' } });
  } finally { client.release(); }
});

app.post('/v1/analyze', async (req, res) => {
  res.set('x-promptcard-backend', 'validated-fallback-v3-billing');
  const user = await userFromRequest(req);
  if (!user) return res.status(401).json({ error: { message: 'Authentication required' } });
  const { messages, temperature = 0.4, max_tokens = 3200 } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: { message: 'messages is required' } });

  const analysisId = crypto.randomUUID();
  const credit = await pool.query('select * from public.consume_promptcard_credit_v2($1,$2)', [user.id, analysisId]);
  const remaining = credit.rows[0]?.total_remaining;
  if (remaining === null || remaining === undefined) {
    return res.status(402).json({ error: { message: 'Built-in credits exhausted. Buy credits or use Custom API to continue.', code: 'credits_exhausted' } });
  }

  try {
    const attempts = [];
    const upstreamUrl = `${process.env.OMNIROUTE_URL.replace(/\/+$/, '')}/v1/chat/completions`;

    for (const model of builtInModels) {
      const params = paramsForModel(model, temperature, max_tokens);
      const startedAt = Date.now();

      try {
        const upstream = await fetch(upstreamUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OMNIROUTE_API_KEY}` },
          body: JSON.stringify({
            model,
            messages,
            temperature: params.temperature ?? temperature,
            max_tokens: params.max_tokens ?? max_tokens,
            stream: false,
            ...params.extra,
          }),
        });
        const body = await upstream.text();
        const complete = upstream.ok && hasCompletePrompt(body);
        let resolvedModel = model;
        try {
          resolvedModel = JSON.parse(body)?.model || resolvedModel;
        } catch {
          // Keep requested model for diagnostics when the upstream body is not JSON.
        }

        attempts.push({
          model,
          resolvedModel,
          status: upstream.status,
          complete,
          elapsedMs: Date.now() - startedAt,
        });
        console.info('[PromptCard fallback] candidate completed', attempts.at(-1));

        if (complete) {
          res.set('x-promptcard-model', resolvedModel);
          res.set('x-promptcard-attempt-count', String(attempts.length));
          return res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(body);
        }
      } catch (candidateError) {
        attempts.push({
          model,
          status: 0,
          complete: false,
          elapsedMs: Date.now() - startedAt,
          error: candidateError instanceof Error ? candidateError.message : String(candidateError),
        });
        console.warn('[PromptCard fallback] candidate failed', attempts.at(-1));
      }
    }

    await pool.query('select public.restore_promptcard_credit_v2($1,$2)', [user.id, analysisId]);
    return res.status(502).json({
      error: {
        message: 'All built-in AI candidates failed validation; credit was restored',
        attempts,
      },
    });
  } catch (error) {
    await pool.query('select public.restore_promptcard_credit_v2($1,$2)', [user.id, analysisId]);
    console.error('[PromptCard fallback] unexpected analyze failure', error);
    res.status(502).json({ error: { message: 'Built-in AI service is unavailable' } });
  }
});

app.use((_req, res) => res.status(404).json({ error: { message: 'Not found' } }));
app.listen(8080, '0.0.0.0');
