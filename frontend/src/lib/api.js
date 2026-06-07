const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  getHoles: () => request('/holes'),

  getModels: () => request('/models'),

  runPrompt: ({ prompt, holeId, model, deterministic }) =>
    request('/run', {
      method: 'POST',
      body: JSON.stringify({ prompt, holeId, model, deterministic }),
    }),

  submitScore: ({ holeId, username, model, deterministic, tokens, prompt }) =>
    request('/submit', {
      method: 'POST',
      body: JSON.stringify({ holeId, username, model, deterministic, tokens, prompt }),
    }),

  getLeaderboard: ({ holeId, model, deterministic }) => {
    const params = new URLSearchParams();
    if (model) params.set('model', model);
    if (deterministic !== undefined) params.set('deterministic', String(deterministic));
    return request(`/leaderboard/${holeId}?${params}`);
  },

  suggestHole: ({ username, title, description, targetOutput, hint }) =>
    request('/suggest-hole', {
      method: 'POST',
      body: JSON.stringify({ username, title, description, targetOutput, hint }),
    }),
};
