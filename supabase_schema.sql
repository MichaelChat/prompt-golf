-- ============================================================
-- PromptGolf — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── Holes (challenges) ────────────────────────────────────────
create table if not exists holes (
  id          serial primary key,
  number      integer unique not null,
  title       text not null,
  description text not null,
  target_output text not null,
  hint        text,
  par         integer not null default 10,
  created_at  timestamptz default now()
);

-- ── Submissions ───────────────────────────────────────────────
create table if not exists submissions (
  id            uuid default gen_random_uuid() primary key,
  hole_id       integer references holes(id) on delete cascade,
  username      text not null check (char_length(username) between 1 and 32),
  model         text not null,
  deterministic boolean default false,
  tokens        integer not null check (tokens between 1 and 999),
  prompt        text not null,
  created_at    timestamptz default now()
);

create index if not exists submissions_hole_model_idx
  on submissions(hole_id, model, deterministic, username, tokens);

-- ── Leaderboard view ─────────────────────────────────────────
-- Best score per (hole, model, deterministic mode, username)
create or replace view leaderboard as
  select distinct on (hole_id, model, deterministic, username)
    hole_id,
    model,
    deterministic,
    username,
    tokens,
    created_at
  from submissions
  order by hole_id, model, deterministic, username, tokens asc, created_at asc;

-- ── Hole suggestions (community) ─────────────────────────────
create table if not exists hole_suggestions (
  id            serial primary key,
  username      text not null,
  title         text not null,
  description   text,
  target_output text not null,
  hint          text,
  reviewed      boolean default false,
  created_at    timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────
alter table holes            enable row level security;
alter table submissions      enable row level security;
alter table hole_suggestions enable row level security;

-- Public read access to holes and submissions
create policy "Public read holes"       on holes       for select using (true);
create policy "Public read submissions" on submissions for select using (true);

-- Anyone can insert submissions and suggestions (no auth in v1)
create policy "Public insert submissions"      on submissions      for insert with check (true);
create policy "Public insert hole_suggestions" on hole_suggestions for insert with check (true);

-- ── Seed data — Hole #1 ───────────────────────────────────────
insert into holes (number, title, description, target_output, hint, par)
values (
  1,
  'Hello, World!',
  'Get the model to respond with exactly the target text — nothing more, nothing less.',
  'H_#_e_#_l_#_l_#_o_#_,_#_ _#_W_#_o_#_r_#_l_#_d_#_!',
  'Try asking the model to repeat text exactly. Don''t worry about token count first — just get it working, then optimise.',
  9
)
on conflict (number) do nothing;

-- ── Optional: a few more starter holes ───────────────────────
insert into holes (number, title, description, target_output, hint, par)
values (
  2,
  'Just the number',
  'Get the model to respond with exactly the number below.',
  '42',
  'Models are surprisingly verbose. You might need to be very explicit.',
  3
),
(
  3,
  'Emoji only',
  'Get the model to respond with exactly these three emoji — no other text.',
  '🎯🏌️⛳',
  'Think about how you can instruct the model to output only specific characters.',
  5
)
on conflict (number) do nothing;
