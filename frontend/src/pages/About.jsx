import { Link } from 'react-router-dom';
import { MODELS } from '../lib/models.js';
import styles from './About.module.css';

export function AboutPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>About PromptGolf</h1>

        <Section heading="What is prompt golf?">
          <p>
            Prompt golf is the neural equivalent of{' '}
            <a href="https://en.wikipedia.org/wiki/Code_golf" target="_blank" rel="noreferrer">
              code golf
            </a>
            {' '}— a game where you try to write the shortest program to produce a given output.
            In prompt golf, you instead try to write the shortest <em>prompt</em> for a large
            language model (LLM) to respond with a specific target output.
          </p>
        </Section>

        <Section heading="Scoring">
          <p>
            Your score is the number of <strong>tokens</strong> in your prompt — not characters.
            Tokens are the chunks that LLMs actually process. A word like <code>hello</code> might
            be one token, but an unusual string like <code>H_#_e</code> could be several.
            The live tokenizer bar shows you exactly how your prompt is being split as you type.
          </p>
          <p>
            Each hole has a <strong>par</strong> — a target token count set by the hole creator.
            Getting under par is the goal.
          </p>
        </Section>

        <Section heading="Non-determinism">
          <p>
            LLMs are non-deterministic by default — the same prompt won't always produce the same
            output. That's why only a single successful attempt is needed to record your score.
            Toggle <strong>deterministic mode</strong> (temp=0) for a separate leaderboard where
            luck plays no role.
          </p>
        </Section>

        <Section heading="Models">
          <p>All prompts are run locally via <a href="https://ollama.ai" target="_blank" rel="noreferrer">Ollama</a>. Available models:</p>
          <ul className={styles.modelList}>
            {MODELS.map(m => (
              <li key={m.id}>
                <code>{m.id}</code> — {m.label}: {m.description}
              </li>
            ))}
          </ul>
          <p>Each model has its own leaderboard since tokenization and instruction-following vary significantly between them.</p>
        </Section>

        <Section heading="The tokenizer">
          <p>
            The token counter runs entirely in your browser using the actual HuggingFace tokenizer
            for the selected model — no server round-trip needed. This means the count you see is
            exactly what the model receives.
          </p>
          <p>
            While the tokenizer is loading, a rough character-based estimate is shown (marked
            "est."). Once it's ready, the exact breakdown appears.
          </p>
        </Section>

        <Section heading="Rules">
          <ul className={styles.ruleList}>
            <li>Prompts must be at most 999 characters</li>
            <li>The model's response is limited to 128 output tokens</li>
            <li>No system prompt — just a single user message</li>
            <li>Only the trimmed response is compared to the target output</li>
            <li>One successful attempt records your score for that hole</li>
          </ul>
        </Section>

        <Section heading="Adding holes">
          <p>
            Use the "Submit a hole idea" panel on any{' '}
            <Link to="/">hole page</Link>. Include a title, the exact target output, and an
            optional hint and description.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ heading, children }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: '0.75rem',
        paddingBottom: '0.4rem',
        borderBottom: '1px solid var(--border)',
      }}>
        {heading}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {children}
      </div>
    </section>
  );
}
