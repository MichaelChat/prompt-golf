import { useState, useEffect } from 'react';

const KEY = 'pg_username';

export function useUsername() {
  const [username, setUsernameState] = useState(() => {
    try { return localStorage.getItem(KEY) || ''; }
    catch { return ''; }
  });

  const setUsername = (name) => {
    setUsernameState(name);
    try { localStorage.setItem(KEY, name); } catch {}
  };

  return [username, setUsername];
}
