// Models available in Ollama + their HuggingFace tokenizer IDs
// The tokenizer is loaded in-browser via @huggingface/transformers
// Falls back to character-based estimation if tokenizer fails to load

export const MODELS = [
  {
    id: 'llama3.1:70b',
    label: 'Llama 3.1 70B',
    tokenizerRepo: 'Xenova/Meta-Llama-3.1-Tokenizer',
    description: 'Meta\'s flagship open model',
  },
  {
    id: 'llama3.1:8b',
    label: 'Llama 3.1 8B',
    tokenizerRepo: 'Xenova/Meta-Llama-3.1-Tokenizer',
    description: 'Faster, smaller Llama 3.1',
  },
  {
    id: 'mistral:7b',
    label: 'Mistral 7B',
    tokenizerRepo: 'Xenova/mistral-tokenizer-v3',
    description: 'Mistral AI\'s base model',
  },
  {
    id: 'phi3:mini',
    label: 'Phi-3 Mini',
    tokenizerRepo: 'Xenova/Phi-3-mini-4k-instruct',
    description: 'Microsoft\'s compact model',
  },
  {
    id: 'gemma2:9b',
    label: 'Gemma 2 9B',
    tokenizerRepo: 'Xenova/gemma-2-tokenizer',
    description: 'Google DeepMind\'s open model',
  },
];

export function getModel(id) {
  return MODELS.find(m => m.id === id) ?? MODELS[0];
}

// Colour assigned to each model for multi-model leaderboard display
export const MODEL_COLOURS = {
  'llama3.1:70b': '#a78bfa',
  'llama3.1:8b':  '#818cf8',
  'mistral:7b':   '#60a5fa',
  'phi3:mini':    '#34d399',
  'gemma2:9b':    '#fbbf24',
};
