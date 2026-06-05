import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useUsername } from '../hooks/useUsername.js';
import styles from './Leaderboard.module.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardPanel({ holeId, model, deterministic, refreshKey }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [username] = useUsername();

  useEffect(() => {
    if (!holeId) return;
    setLoading(true);
    setError(null);
    api.getLeaderboard({ holeId, model, deterministic })
      .then(d => setEntries(d.leaderboard || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [holeId, model, deterministic, refreshKey]);

  const myRank = entries.findIndex(e => e.username === username);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Leaderboard</span>
        {loading && <span className={styles.spinner} aria-label="Loading" />}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!loading && entries.length === 0 && !error && (
        <p className={styles.empty}>No submissions yet — be first!</p>
      )}

      <ol className={styles.list}>
        {entries.slice(0, 15).map((e, i) => {
          const isYou = e.username === username;
          return (
            <li key={`${e.username}-${i}`} className={`${styles.row} ${isYou ? styles.you : ''}`}>
              <span className={styles.rank}>
                {i < 3 ? MEDALS[i] : <span className={styles.rankNum}>{i + 1}</span>}
              </span>
              <span className={styles.name}>{e.username}</span>
              {isYou && <span className={styles.youBadge}>you</span>}
              <span className={styles.tokens}>{e.tokens}</span>
            </li>
          );
        })}
      </ol>

      {myRank > 14 && (
        <div className={styles.yourScore}>
          <span className={styles.rank}><span className={styles.rankNum}>{myRank + 1}</span></span>
          <span className={styles.name}>{username}</span>
          <span className={styles.youBadge}>you</span>
          <span className={styles.tokens}>{entries[myRank].tokens}</span>
        </div>
      )}

      {entries.length > 15 && (
        <p className={styles.more}>+{entries.length - 15} more</p>
      )}
    </div>
  );
}
