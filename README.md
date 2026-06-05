# ⛳ PromptGolf

A competitive prompt golfing game for you and your friends — get an LLM to produce a target output using the fewest tokens possible.

## Features
- 🔤 **Live tokenizer** — see your prompt split into tokens in real time (runs in-browser, no server needed)
- 🤖 **Multi-model leaderboards** — separate boards per model (Llama, Mistral, Phi, Gemma, etc.)
- 🌡️ **Deterministic mode** — toggle temp=0 for pure-skill competition
- 🏌️ **Community holes** — anyone can submit a challenge
- 👤 **No auth** — just pick a username and play

## Tech Stack
- **Frontend**: React + Vite, hosted on GitHub Pages
- **Backend**: Express.js proxy to Ollama (run locally or on a VPS)
- **Leaderboard**: Supabase (free tier)
- **Tokenizer**: `@huggingface/transformers` (WASM, runs in browser)

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- A free [Groq](https://console.groq.com) account (for the LLM API)
- A free [Supabase](https://supabase.com/) project

### 1. Clone & install
```bash
git clone https://github.com/YOUR_USERNAME/promptgolf
cd promptgolf

# Install both frontend and backend
npm run install:all
```

### 2. Set up Supabase
Run this SQL in your Supabase project's SQL editor:

```sql
-- Holes (challenges)
create table holes (
  id serial primary key,
  number integer unique not null,
  title text not null,
  description text not null,
  target_output text not null,
  hint text,
  par integer not null,
  created_at timestamptz default now()
);

-- Submissions
create table submissions (
  id uuid default gen_random_uuid() primary key,
  hole_id integer references holes(id),
  username text not null,
  model text not null,
  deterministic boolean default false,
  tokens integer not null,
  prompt text not null,
  created_at timestamptz default now()
);

-- Best scores per (hole, model, username, deterministic) — used for leaderboard
create view leaderboard as
  select distinct on (hole_id, model, deterministic, username)
    hole_id, model, deterministic, username, tokens, created_at
  from submissions
  order by hole_id, model, deterministic, username, tokens asc, created_at asc;

-- Enable Row Level Security (read-only public access is fine for v1)
alter table holes enable row level security;
alter table submissions enable row level security;

create policy "Public read holes" on holes for select using (true);
create policy "Public read submissions" on submissions for select using (true);
create policy "Public insert submissions" on submissions for insert with check (true);

-- Seed with hole #1
insert into holes (number, title, description, target_output, hint, par)
values (
  1,
  'Hello, World!',
  'Get the model to respond with exactly the target text — nothing more, nothing less.',
  'H_#_e_#_l_#_l_#_o_#_,_#_ _#_W_#_o_#_r_#_l_#_d_#_!',
  'Try asking the model to repeat text exactly. Don''t worry about token count yet — just get it working first.',
  9
);
```

### 3. Configure environment
```bash
# backend/.env
cp backend/.env.example backend/.env
# Fill in OLLAMA_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY

# frontend/.env
cp frontend/.env.example frontend/.env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_BACKEND_URL
```

### 4. Run locally
```bash
# Terminal 1 — backend (proxies to Groq)
npm run dev:backend

# Terminal 2 — frontend
npm run dev:frontend
```

Open http://localhost:5173

### 5. Deploy

**Frontend → GitHub Pages:**
```bash
cd frontend
npm run build
npm run deploy   # uses gh-pages package
```

**Backend → anywhere with Node.js:**
- Fly.io free tier: `fly launch` in the `backend/` folder
- Railway: connect the repo, set root to `backend/`
- Or just run it at home behind `cloudflared tunnel`


## Adding new holes
Just insert a row in the `holes` table — the frontend picks it up automatically.

The frontend's model list is configured in `frontend/src/lib/models.ts`.

## Contributing holes
Open a GitHub Issue with the template "New Hole Idea" — fill in the title, description, target output, and hint.
