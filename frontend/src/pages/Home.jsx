import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import styles from './Home.module.css';

export function HomePage() {
  const [holes, setHoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getHoles()
      .then(d => setHoles(d.holes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>Loading holes…</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>All Holes</h1>
        <p className={styles.subtitle}>
          Get the model to produce the target output in as few tokens as possible.
        </p>
      </div>

      {holes.length === 0 ? (
        <div className={styles.empty}>
          <p>No holes yet — add one in Supabase!</p>
          <code className={styles.hint}>
            insert into holes (number, title, description, target_output, par) values …
          </code>
        </div>
      ) : (
        <div className={styles.grid}>
          {holes.map(hole => (
            <button
              key={hole.id}
              className={styles.card}
              onClick={() => navigate(`/hole/${hole.number}`)}
            >
              <div className={styles.cardTop}>
                <span className={styles.holeNum}>#{hole.number}</span>
                <span className={styles.par}>par {hole.par}</span>
              </div>
              <h2 className={styles.cardTitle}>{hole.title}</h2>
              <p className={styles.cardDesc}>{hole.description}</p>
              <div className={styles.cardTarget}>
                <span className={styles.targetLabel}>target</span>
                <code className={styles.targetVal}>{hole.target_output}</code>
              </div>
              <div className={styles.cardFooter}>
                Play →
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
