import { useState } from 'react';

const KEY = 'pg_username';

export function useUsername() {
  const [username, setUsernameState] = useState(() => {
    try { return localStorage.getItem(KEY) || ''; }
    catch { return ''; }
  });

  const setUsername = (name) => {
    setUsernameState(name);
    try {
      if (name.trim()) {
        localStorage.setItem(KEY, name);
      } else {
        localStorage.removeItem(KEY);
      }
    } catch {}
  };

  return [username, setUsername];
}
