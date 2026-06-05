import { getTokenColour } from '../hooks/useTokenizer.js';
import styles from './TokenBar.module.css';

export function TokenBar({ tokens, loading, ready }) {
  if (!tokens || tokens.length === 0) {
    return (
      <div className={styles.empty}>
        {loading
          ? <span className={styles.loadingMsg}>Loading tokenizer…</span>
          : <span className={styles.placeholder}>Token breakdown will appear here</span>
        }
      </div>
    );
  }

  return (
    <div className={styles.bar} role="region" aria-label="Token breakdown">
      <div className={styles.pills}>
        {tokens.map((tok, i) => {
          const col = getTokenColour(i);
          return (
            <span
              key={i}
              className={styles.pill}
              style={{
                background: col.bg,
                borderColor: col.border,
                color: col.text,
              }}
              title={`Token ${i + 1}: "${tok}"`}
            >
              {/* Show spaces explicitly */}
              {tok.replace(/ /g, '·')}
            </span>
          );
        })}
      </div>
      <div className={styles.meta}>
        <span className={styles.count}>
          <strong>{tokens.length}</strong> token{tokens.length !== 1 ? 's' : ''}
        </span>
        {!ready && (
          <span className={styles.est}>est.</span>
        )}
      </div>
    </div>
  );
}
