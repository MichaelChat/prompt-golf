import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { MODELS } from '../lib/models.js';
import { useUsername } from '../hooks/useUsername.js';
import styles from './GlobalLeaderboard.module.css';

export function GlobalLeaderboardPage() {
  const [holes, setHoles] = useState([]);
  const [model, setModel] = useState(MODELS[0].id);
  const [deterministic, setDeterministic] = useState(false);
  const [boards, setBoards] = useState({}); // { [holeId]: entries[] }
  const [loading, setLoading] = useState(false);
  const [username] = useUsername();
  const navigate = useNavigate();

  useEffect(() => {
    api.getHoles().then(d => setHoles(d.holes || []));
  }, []);

  useEffect(() => {
    if (!holes.length) return;
    setLoading(true);
    Promise.all(
      holes.map(h =>
        api.getLeaderboard({ holeId: h.id, model, deterministic })
          .then(d => ({ holeId: h.id, entries: d.leaderboard || [] }))
          .catch(() => ({ holeId: h.id, entries: [] }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.holeId] = r.entries; });
      setBoards(map);
      setLoading(false);
    });
  }, [holes, model, deterministic]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Leaderboard</h1>
        <div className={styles.filters}>
          <select
            className={styles.select}
            value={model}
            onChange={e => setModel(e.target.value)}
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <label className={styles.detLabel}>
            <input
              type="checkbox"
              checked={deterministic}
              onChange={e => setDeterministic(e.target.checked)}
            />
            <span className={styles.detText}>deterministic only</span>
          </label>
        </div>
      </div>

      {loading && <p className={styles.loading}>Loading…</p>}

      <div className={styles.grid}>
        {holes.map(hole => {
          const entries = boards[hole.id] || [];
          const myEntry = entries.find(e => e.username === username);
          const myRank = myEntry ? entries.indexOf(myEntry) + 1 : null;

          return (
            <div key={hole.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardNum}>Hole {hole.number}</span>

                <button
                  className={styles.playBtn}
                  onClick={() => navigate(`/hole/${hole.number}`)}
                >
                  Play →
                </button>
              </div>
              <h2 className={styles.cardTitle}>{hole.title}</h2>

              {myEntry && (
                <div className={styles.myScore}>
                  Your best: <strong>{myEntry.tokens} tokens</strong>
                  {' '}<span className={styles.myRank}>#{myRank}</span>
                </div>
              )}

              {entries.length === 0 ? (
                <p className={styles.empty}>No submissions yet</p>
              ) : (
                <ol className={styles.list}>
                  {entries.slice(0, 5).map((e, i) => (
                    <li
                      key={`${e.username}-${i}`}
                      className={`${styles.row} ${e.username === username ? styles.you : ''}`}
                    >
                      <span className={styles.rank}>{['🥇','🥈','🥉'][i] ?? i + 1}</span>
                      <span className={styles.name}>{e.username}</span>
                      <span className={styles.tokens}>{e.tokens}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
