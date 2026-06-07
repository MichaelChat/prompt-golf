import { useState, useEffect } from 'react';

const KEY = 'pg_username';

// Custom event so all components stay in sync
const EVENT = 'pg_username_change';

function getStored() {
  try { return localStorage.getItem(KEY) || ''; }
  catch { return ''; }
}

export function useUsername() {
  const [username, setUsernameState] = useState(getStored);

  // Listen for changes from other components (e.g. Nav updating, Hole reading)
  useEffect(() => {
    const handler = () => setUsernameState(getStored());
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
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
    // Notify all other components using useUsername
    window.dispatchEvent(new Event(EVENT));
  };

  return [username, setUsername];
}
