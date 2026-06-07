import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { MODELS, getModel } from '../lib/models.js';
import { useTokenizer } from '../hooks/useTokenizer.js';
import { useUsername } from '../hooks/useUsername.js';
import { TokenBar } from '../components/TokenBar.jsx';
import { LeaderboardPanel } from '../components/Leaderboard.jsx';
import styles from './Hole.module.css';

export function HolePage() {
  const { holeNumber } = useParams();
  const navigate = useNavigate();

  const [holes, setHoles] = useState([]);
  const [hole, setHole] = useState(null);
  const [holesLoading, setHolesLoading] = useState(true);

  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(MODELS[0].id);
  const [deterministic, setDeterministic] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const [lbRefresh, setLbRefresh] = useState(0);
  const [username, setUsername] = useUsername();
  const hasUsername = username.trim().length > 0;

  // Clear username error when they start typing a name
  useEffect(() => {
    if (hasUsername) setSubmitError(null);
  }, [username]);
  const textareaRef = useRef(null);

  const { tokens, tokenize, loading: tokLoading, ready: tokReady } = useTokenizer(model);

  // Load holes
  useEffect(() => {
    api.getHoles()
      .then(d => {
        setHoles(d.holes || []);
        setHolesLoading(false);
      })
      .catch(() => setHolesLoading(false));
  }, []);

  // Set active hole
  useEffect(() => {
    if (!holes.length) return;
    const num = parseInt(holeNumber || '1', 10);
    const found = holes.find(h => h.number === num);
    if (found) {
      setHole(found);
      setResult(null);
      setPrompt('');
    } else if (!holeNumber) {
      navigate(`/hole/1`, { replace: true });
    }
  }, [holes, holeNumber, navigate]);

  // Live tokenization
  useEffect(() => {
    tokenize(prompt);
  }, [prompt, tokenize]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || !hole) return;
    if (!hasUsername) {
      setSubmitError('Please enter a username in the top-right first.');
      return;
    }

    setRunning(true);
    setResult(null);
    setSubmitError(null);

    try {
      const { output } = await api.runPrompt({ prompt, model, deterministic });
      const matched = output.trim() === hole.target_output.trim();

      setResult({ output, matched, tokens: tokens.length });

      if (matched) {
        await api.submitScore({
          holeId: hole.id,
          username: username.trim(),
          model,
          deterministic,
          tokens: tokens.length,
          prompt,
        });
        setLbRefresh(n => n + 1);
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setRunning(false);
    }
  }, [prompt, hole, model, deterministic, tokens, username]);

  // Ctrl/Cmd+Enter to submit
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit]);

  if (holesLoading) return <div className={styles.loading}>Loading holes…</div>;
  if (!hole) return <div className={styles.loading}>Hole not found.</div>;

  const modelInfo = getModel(model);

  return (
    <div className={styles.layout}>
      {/* ── Main column ── */}
      <main className={styles.main}>
        {/* Hole header */}
        <div className={styles.holeHeader}>
          <div className={styles.holeMeta}>
            <span className={styles.holeNum}>Hole {hole.number}</span>
            {deterministic && (
              <span className={styles.detBadge}>temp=0</span>
            )}
          </div>
          <h1 className={styles.holeTitle}>{hole.title}</h1>
          <p className={styles.holeDesc}>{hole.description}</p>
        </div>

        {/* Target output */}
        <section className={styles.targetBox}>
          <div className={styles.sectionLabel}>target output</div>
          <pre className={styles.targetText}>{hole.target_output}</pre>
        </section>

        {/* Hint */}
        {hole.hint && (
          <div className={styles.hintSection}>
            <button
              className={styles.hintToggle}
              onClick={() => setShowHint(v => !v)}
              aria-expanded={showHint}
            >
              {showHint ? '▾' : '▸'} {showHint ? 'Hide' : 'Show'} hint
            </button>
            {showHint && (
              <p className={`${styles.hintText} fade-in`}>{hole.hint}</p>
            )}
          </div>
        )}

        {/* Prompt input */}
        <section className={styles.inputSection}>
          <div className={styles.sectionLabel}>your prompt</div>
          <textarea
            ref={textareaRef}
            className={styles.promptInput}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Write your prompt here…"
            rows={5}
            maxLength={999}
            aria-label="Prompt input"
          />
          <div className={styles.charCount}>{prompt.length}/999 chars</div>
        </section>

        {/* Token bar */}
        <section className={styles.tokenSection}>
          <div className={styles.sectionLabel}>
            token breakdown
            {tokLoading && <span className={styles.tokLoadingBadge}>loading tokenizer…</span>}
            {tokReady && <span className={styles.tokReadyBadge}>✓ {modelInfo.label}</span>}
          </div>
          <TokenBar tokens={tokens} loading={tokLoading} ready={tokReady} />
        </section>

        {/* Controls */}
        <div className={styles.controls}>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={running || !prompt.trim() || !hasUsername}
            aria-busy={running}
          >
            {running ? (
              <><span className={styles.spinner} /> Running…</>
            ) : (
              <>▶ Submit <kbd className={styles.kbd}>⌘↵</kbd></>
            )}
          </button>

          <select
            className={styles.modelSelect}
            value={model}
            onChange={e => setModel(e.target.value)}
            aria-label="Select model"
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          <label className={styles.detToggle}>
            <input
              type="checkbox"
              checked={deterministic}
              onChange={e => setDeterministic(e.target.checked)}
            />
            <span className={styles.toggleTrack} />
            <span className={styles.toggleLabel}>deterministic (temp=0)</span>
          </label>
        </div>

        {submitError && (
          <p className={`${styles.errorMsg} fade-in`}>{submitError}</p>
        )}

        {/* Result */}
        {result && (
          <div className={`${styles.result} ${result.matched ? styles.resultOk : styles.resultFail} fade-in`}>
            <div className={styles.resultHeader}>
              <span className={styles.resultDot} />
              <strong>
                {result.matched
                  ? `Match! ${result.tokens} token${result.tokens !== 1 ? 's' : ''}`
                  : 'No match — try again'}
              </strong>
            </div>
            <pre className={styles.resultOutput}>{result.output}</pre>
          </div>
        )}
      </main>

      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sideCard}>
          <div className={styles.sideTitle}>Leaderboard</div>
          <div className={styles.lbModelRow}>
            <select
              className={styles.modelSelect}
              value={model}
              onChange={e => setModel(e.target.value)}
              aria-label="Leaderboard model filter"
              style={{ width: '100%' }}
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <LeaderboardPanel
            holeId={hole.id}
            model={model}
            deterministic={deterministic}
            refreshKey={lbRefresh}
          />
        </div>

        {/* Hole picker */}
        <div className={styles.sideCard}>
          <div className={styles.sideTitle}>All holes</div>
          <div className={styles.holePicker}>
            {holes.map(h => (
              <button
                key={h.id}
                className={`${styles.holeChip} ${h.number === hole.number ? styles.holeChipActive : ''}`}
                onClick={() => navigate(`/hole/${h.number}`)}
                title={h.title}
                aria-current={h.number === hole.number ? 'page' : undefined}
              >
                {h.number}
              </button>
            ))}
          </div>
        </div>

        {/* Submit a hole idea */}
        <SuggestHole username={username} />
      </aside>
    </div>
  );
}

function SuggestHole({ username }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', targetOutput: '', hint: '' });
  const [status, setStatus] = useState(null);

  const handleSubmit = async () => {
    if (!form.title || !form.targetOutput) return;
    try {
      await api.suggestHole({ ...form, username: username || 'anonymous' });
      setStatus('success');
      setForm({ title: '', description: '', targetOutput: '', hint: '' });
    } catch (e) {
      setStatus('error');
    }
  };

  return (
    <div className={styles.sideCard} style={{ borderStyle: 'dashed' }}>
      <button
        className={styles.suggestToggle}
        onClick={() => setOpen(v => !v)}
      >
        + Submit a hole idea
      </button>
      {open && (
        <div className={`${styles.suggestForm} fade-in`}>
          <input
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          />
          <input
            placeholder="Target output (exact)"
            value={form.targetOutput}
            onChange={e => setForm(f => ({ ...f, targetOutput: e.target.value }))}
            style={{ width: '100%', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          />
          <input
            placeholder="Hint (optional)"
            value={form.hint}
            onChange={e => setForm(f => ({ ...f, hint: e.target.value }))}
            style={{ width: '100%', marginBottom: '0.75rem' }}
          />
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={!form.title || !form.targetOutput}
            style={{ width: '100%' }}
          >
            Submit idea
          </button>
          {status === 'success' && <p className={styles.successMsg}>Thanks! We'll review it.</p>}
          {status === 'error' && <p className={styles.errorMsg}>Failed to submit. Try again.</p>}
        </div>
      )}
    </div>
  );
}
