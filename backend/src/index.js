import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { judgeResponse } from './judge.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } }
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  }
}));
app.use(express.json());

// ── Groq model ID mapping ─────────────────────────────────────────────────────
const GROQ_MODELS = {
  'llama3.1:70b': 'llama-3.3-70b-versatile',
  'llama3.1:8b':  'llama-3.1-8b-instant',
  'gemma2:9b':    'gemma2-9b-it',
};

const DEFAULT_MODEL = 'llama3.1:70b';

// ── Holes — served from Supabase ──────────────────────────────────────────────
// Cached in memory to avoid extra DB calls on every /run
let holesCache = null;

async function getHoles() {
  if (holesCache) return holesCache;
  const { data, error } = await supabase
    .from('holes')
    .select('id, number, title, description, target_output, hint, rules')
    .order('number');
  if (error) throw new Error(error.message);
  holesCache = data;
  // Invalidate cache every 5 minutes so new holes appear
  setTimeout(() => { holesCache = null; }, 5 * 60 * 1000);
  return holesCache;
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, provider: 'groq' }));

// ── List available models ─────────────────────────────────────────────────────
app.get('/models', (_req, res) => {
  const models = Object.keys(GROQ_MODELS).map(id => ({ id, label: id }));
  res.json({ models });
});

// ── Get all holes ─────────────────────────────────────────────────────────────
app.get('/holes', async (_req, res) => {
  try {
    const holes = await getHoles();
    res.json({ holes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Run a prompt against Groq + judge the result ──────────────────────────────
// POST /run  { prompt, holeId, model, deterministic }
app.post('/run', async (req, res) => {
  const { prompt, holeId, model = DEFAULT_MODEL, deterministic = false } = req.body;

  if (prompt === undefined || prompt === null || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }
  if (prompt.length > 999) {
    return res.status(400).json({ error: 'Prompt exceeds 999 character limit' });
  }
  if (!holeId) {
    return res.status(400).json({ error: 'holeId is required' });
  }

  // Fetch hole rules
  let hole;
  try {
    const holes = await getHoles();
    hole = holes.find(h => h.id === holeId || h.id === Number(holeId));
    if (!hole) return res.status(404).json({ error: 'Hole not found' });
  } catch (err) {
    return res.status(500).json({ error: `Failed to fetch hole: ${err.message}` });
  }

  // Build rules — use hole.rules if present, otherwise fall back to target_output exact match
  const rules = (hole.rules && hole.rules.length > 0)
    ? hole.rules
    : [{ type: 'regex', pattern: `^${escapeRegex(hole.target_output ?? '')}$` }];

  // Run prompt through Groq
  const groqModel = GROQ_MODELS[model] ?? GROQ_MODELS[DEFAULT_MODEL];
  let output;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: deterministic ? 0 : 0.7,
        max_tokens: 128,
      }),
    });

    if (!groqRes.ok) {
      const text = await groqRes.text();
      console.error('Groq error:', text);
      return res.status(502).json({ error: `Groq API error: ${groqRes.status}` });
    }

    const data = await groqRes.json();
    output = data.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    console.error('Groq request failed:', err.message);
    return res.status(502).json({ error: 'Failed to reach Groq API' });
  }

  // Judge the output
  const { matched, results } = await judgeResponse({ output, prompt, rules });

  res.json({ output, matched, results });
});

// ── Submit a successful score ──────────────────────────────────────────────────
// POST /submit  { holeId, username, model, deterministic, tokens, prompt }
app.post('/submit', async (req, res) => {
  const { holeId, username, model, deterministic = false, tokens, prompt } = req.body;

  if (!holeId || !username || !model || tokens === undefined || !prompt) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (typeof tokens !== 'number' || tokens < 1 || tokens > 999) {
    return res.status(400).json({ error: 'Invalid token count' });
  }
  if (username.length > 32) {
    return res.status(400).json({ error: 'Username too long (max 32 chars)' });
  }

  const { error } = await supabase.from('submissions').insert({
    hole_id: holeId,
    username: username.trim(),
    model,
    deterministic,
    tokens,
    prompt,
  });

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: 'Failed to save submission' });
  }

  res.json({ ok: true });
});

// ── Leaderboard for a hole ─────────────────────────────────────────────────────
app.get('/leaderboard/:holeId', async (req, res) => {
  const { holeId } = req.params;
  const { model, deterministic } = req.query;

  let query = supabase
    .from('leaderboard')
    .select('username, tokens, model, deterministic, created_at')
    .eq('hole_id', holeId)
    .order('tokens', { ascending: true })
    .limit(100);

  if (model) query = query.eq('model', model);
  if (deterministic !== undefined) query = query.eq('deterministic', deterministic === 'true');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ leaderboard: data });
});

// ── Submit a hole idea ────────────────────────────────────────────────────────
app.post('/suggest-hole', async (req, res) => {
  const { username, title, description, targetOutput, hint } = req.body;
  if (!username || !title || !targetOutput) {
    return res.status(400).json({ error: 'username, title and targetOutput are required' });
  }

  const { error } = await supabase.from('hole_suggestions').insert({
    username: username.trim(),
    title,
    description,
    target_output: targetOutput,
    hint,
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

app.listen(PORT, () => {
  console.log(`⛳ PromptGolf backend running on http://localhost:${PORT}`);
  console.log(`   Provider: Groq`);
});
