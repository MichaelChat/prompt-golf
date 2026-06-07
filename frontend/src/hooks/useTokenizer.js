import { useState, useEffect, useRef, useCallback } from 'react';
import { getModel } from '../lib/models.js';

// Fallback: rough character-based token estimator
// Real tokenizers split differently but this gives a ballpark while loading
function estimateTokens(text) {
  if (!text) return [];
  // Split on whitespace and punctuation boundaries (very rough)
  const words = text.match(/\S+|\s+/g) || [];
  const tokens = [];
  for (const w of words) {
    if (w.trim().length === 0) continue;
    // Long words get split roughly every 4 chars
    if (w.length > 6) {
      for (let i = 0; i < w.length; i += 4) {
        tokens.push(w.slice(i, i + 4));
      }
    } else {
      tokens.push(w);
    }
  }
  return tokens;
}

// Token colours — cycle through a palette for visual distinction
const TOKEN_PALETTE = [
  { bg: '#1a0f2e', border: '#7c3aed', text: '#c4b5fd' },
  { bg: '#0a1a0a', border: '#16a34a', text: '#86efac' },
  { bg: '#1c1000', border: '#d97706', text: '#fde68a' },
  { bg: '#0a1628', border: '#2563eb', text: '#93c5fd' },
  { bg: '#1a0a0a', border: '#dc2626', text: '#fca5a5' },
  { bg: '#0a1a1a', border: '#0891b2', text: '#67e8f9' },
];

export function getTokenColour(index) {
  return TOKEN_PALETTE[index % TOKEN_PALETTE.length];
}

// The actual hook
export function useTokenizer(modelId) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const workerRef = useRef(null);
  const queuedRef = useRef(null);

  useEffect(() => {
    // Create a worker that loads the HF tokenizer
    const workerCode = `
      import { AutoTokenizer } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

      let tokenizer = null;
      let currentRepo = null;

      self.onmessage = async (e) => {
        const { type, repo, text, id } = e.data;

        if (type === 'load') {
          if (repo === currentRepo && tokenizer) {
            self.postMessage({ type: 'ready', repo });
            return;
          }
          try {
            self.postMessage({ type: 'loading' });
            tokenizer = await AutoTokenizer.from_pretrained(repo);
            currentRepo = repo;
            self.postMessage({ type: 'ready', repo });
          } catch (err) {
            self.postMessage({ type: 'error', message: err.message });
          }
        }

        if (type === 'tokenize') {
          if (!tokenizer) {
            self.postMessage({ type: 'result', id, tokens: null });
            return;
          }
          try {
            const encoded = tokenizer.encode(text, { add_special_tokens: false });
            const tokenStrings = encoded.map(tid => tokenizer.decode([tid]));
            self.postMessage({ type: 'result', id, tokens: tokenStrings });
          } catch (err) {
            self.postMessage({ type: 'result', id, tokens: null });
          }
        }
      };
    `;

    let worker;
    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      worker = new Worker(url, { type: 'module' });
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, tokens: toks, id } = e.data;
        if (type === 'loading') setLoading(true);
        if (type === 'ready') { setLoading(false); setReady(true); }
        if (type === 'error') { setLoading(false); }
        if (type === 'result' && toks !== null) {
          setTokens(toks);
        }
      };
    } catch (err) {
      // Worker failed (e.g. sandboxed env) — fall back to estimator
      console.warn('Tokenizer worker failed, using estimator:', err.message);
    }

    return () => {
      worker?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Load tokenizer when model changes
  useEffect(() => {
    if (!modelId || !workerRef.current) return;

    const model = getModel(modelId);
    if (model?.tokenizerRepo && workerRef.current) {
      setReady(false);
      workerRef.current.postMessage({ type: 'load', repo: model.tokenizerRepo });
    }
  }, [modelId]);

  const tokenize = useCallback((text) => {
    if (!text) { setTokens([]); return; }

    if (!ready || !workerRef.current) {
      // Use estimator while tokenizer loads
      setTokens(estimateTokens(text));
      return;
    }

    const id = Date.now();
    workerRef.current.postMessage({ type: 'tokenize', text, id });
  }, [ready]);

  return { tokens, tokenize, loading, ready };
}
