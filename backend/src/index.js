import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

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
// Frontend model IDs → Groq API model strings
const GROQ_MODELS = {
  'llama3.1:70b':  'llama-3.1-70b-versatile',
  'llama3.1:8b':   'llama-3.1-8b-instant',
  'mistral:7b':    'mixtral-8x7b-32768',
  'gemma2:9b':     'gemma2-9b-it',
};

const DEFAULT_MODEL = 'llama3.1:70b';

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, provider: 'groq' }));

// ── List available models ─────────────────────────────────────────────────────
// Returns the same shape the frontend expects
app.get('/models', (_req, res) => {
  const models = Object.keys(GROQ_MODELS).map(id => ({ id, label: id }));
  res.json({ models });
});

// ── Run a prompt against Groq ─────────────────────────────────────────────────
// POST /run  { prompt, model, deterministic }
app.post('/run', async (req, res) => {
  const { prompt, model = DEFAULT_MODEL, deterministic = false } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }
  if (prompt.length > 999) {
    return res.status(400).json({ error: 'Prompt exceeds 999 character limit' });
  }

  const groqModel = GROQ_MODELS[model] ?? GROQ_MODELS[DEFAULT_MODEL];

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
    const output = data.choices?.[0]?.message?.content ?? '';

    res.json({ output });
  } catch (err) {
    console.error('Groq request failed:', err.message);
    res.status(502).json({ error: 'Failed to reach Groq API' });
  }
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

// ── Get all holes ──────────────────────────────────────────────────────────────
app.get('/holes', async (_req, res) => {
  const { data, error } = await supabase
    .from('holes')
    .select('id, number, title, description, target_output, hint')
    .order('number');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ holes: data });
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

app.listen(PORT, () => {
  console.log(`⛳ PromptGolf backend running on http://localhost:${PORT}`);
  console.log(`   Provider: Groq`);
});
