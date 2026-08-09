import express from 'express';
import { Pool } from 'pg';

const required = ['DATABASE_URL', 'SUPABASE_INTERNAL_URL', 'SUPABASE_ANON_KEY', 'OMNIROUTE_URL', 'OMNIROUTE_API_KEY'];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
app.use(express.json({ limit: '12mb' }));

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

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/v1/credits', async (req, res) => {
  const user = await userFromRequest(req);
  if (!user) return res.status(401).json({ error: { message: 'Authentication required' } });
  const result = await pool.query('select remaining_uses from public.promptcard_credits where user_id = $1', [user.id]);
  res.json({ remaining_uses: result.rows[0]?.remaining_uses ?? null });
});

app.post('/v1/analyze', async (req, res) => {
  res.set('x-promptcard-backend', 'validated-fallback-v2');
  const user = await userFromRequest(req);
  if (!user) return res.status(401).json({ error: { message: 'Authentication required' } });
  const { messages, temperature = 0.4, max_tokens = 3200 } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: { message: 'messages is required' } });

  const credit = await pool.query('select * from public.consume_promptcard_credit($1)', [user.id]);
  const remaining = credit.rows[0]?.remaining_uses;
  if (remaining === null || remaining === undefined) {
    return res.status(402).json({ error: { message: 'Free built-in credits exhausted. Use Custom API to continue.' } });
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

    await pool.query('select public.restore_promptcard_credit($1)', [user.id]);
    return res.status(502).json({
      error: {
        message: 'All built-in AI candidates failed validation; credit was restored',
        attempts,
      },
    });
  } catch (error) {
    await pool.query('select public.restore_promptcard_credit($1)', [user.id]);
    console.error('[PromptCard fallback] unexpected analyze failure', error);
    res.status(502).json({ error: { message: 'Built-in AI service is unavailable' } });
  }
});

app.use((_req, res) => res.status(404).json({ error: { message: 'Not found' } }));
app.listen(8080, '0.0.0.0');
