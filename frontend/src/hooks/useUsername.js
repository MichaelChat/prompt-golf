import { useState, useEffect } from 'react';

const KEY = 'pg_username';

export function useUsername() {
  const [username, setUsernameState] = useState('');

  // Load from localStorage after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setUsernameState(saved);
    } catch {}
  }, []);

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
