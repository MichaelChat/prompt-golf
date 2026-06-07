// ── PromptGolf Judge Engine ───────────────────────────────────────────────────
//
// Each hole has a `rules` array. ALL rules must pass for a submission to match.
//
// Adding a new rule type:
//   1. Add a case to the switch in judgeRule()
//   2. Add it to RULE_TYPES at the bottom
//
// Rule shape:  { type: string, ...config }
// Result shape: { passed: boolean, reason: string }

import fetch from 'node-fetch';

// ── Individual rule evaluator ─────────────────────────────────────────────────
async function judgeRule(rule, { output, prompt }) {
  const o = output.trim();

  switch (rule.type) {

    // Regex match — covers exact (^target$), starts_with (^val), ends_with (val$)
    case 'regex': {
      let re;
      try {
        re = new RegExp(rule.pattern, rule.flags ?? '');
      } catch (e) {
        return { passed: false, reason: `Invalid regex: ${e.message}` };
      }
      const passed = re.test(o);
      return {
        passed,
        reason: passed
          ? `Output matches /${rule.pattern}/`
          : `Output does not match /${rule.pattern}/`,
      };
    }

    // Output must equal the prompt (quine)
    case 'quine': {
      const passed = o === prompt.trim();
      return {
        passed,
        reason: passed
          ? 'Output matches prompt exactly'
          : 'Output does not match prompt',
      };
    }

    // Exact word count
    case 'word_count': {
      const words = o.split(/\s+/).filter(Boolean);
      const passed = words.length === rule.count;
      return {
        passed,
        reason: passed
          ? `Output is exactly ${rule.count} words`
          : `Expected ${rule.count} words, got ${words.length}`,
      };
    }

    // Word count ceiling
    case 'max_words': {
      const words = o.split(/\s+/).filter(Boolean);
      const passed = words.length <= rule.count;
      return {
        passed,
        reason: passed
          ? `Output is ${words.length} words (≤ ${rule.count})`
          : `Output is ${words.length} words, must be ≤ ${rule.count}`,
      };
    }

    // Word count floor
    case 'min_words': {
      const words = o.split(/\s+/).filter(Boolean);
      const passed = words.length >= rule.count;
      return {
        passed,
        reason: passed
          ? `Output is ${words.length} words (≥ ${rule.count})`
          : `Output is ${words.length} words, must be ≥ ${rule.count}`,
      };
    }

    // Exact character count (trimmed)
    case 'char_count': {
      const passed = o.length === rule.count;
      return {
        passed,
        reason: passed
          ? `Output is exactly ${rule.count} characters`
          : `Expected ${rule.count} characters, got ${o.length}`,
      };
    }

    // Valid JSON, with optional required keys check
    case 'json_valid': {
      let parsed;
      try {
        parsed = JSON.parse(o);
      } catch (e) {
        return { passed: false, reason: `Output is not valid JSON: ${e.message}` };
      }
      if (rule.required_keys?.length) {
        const missing = rule.required_keys.filter(k => !(k in parsed));
        if (missing.length) {
          return { passed: false, reason: `Missing required keys: ${missing.join(', ')}` };
        }
      }
      return { passed: true, reason: 'Output is valid JSON' };
    }

    // LLM judge — second Groq call evaluates freeform criteria
    case 'llm': {
      const systemPrompt = `You are a strict output judge.
Evaluate whether the following text meets this criterion: "${rule.criteria}"
Reply with ONLY "PASS" or "FAIL" followed by one sentence explanation.
Example: "PASS The text contains no letter e."
Example: "FAIL The text contains the letter e in the word 'the'."`;

      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Text to evaluate:\n${o}` },
            ],
            temperature: 0,
            max_tokens: 60,
          }),
        });
        const data = await res.json();
        const verdict = data.choices?.[0]?.message?.content?.trim() ?? '';
        const passed = verdict.toUpperCase().startsWith('PASS');
        return {
          passed,
          reason: verdict || 'LLM judge returned no verdict',
        };
      } catch (e) {
        return { passed: false, reason: `LLM judge error: ${e.message}` };
      }
    }

    default:
      return { passed: false, reason: `Unknown rule type: "${rule.type}"` };
  }
}

// ── Main judge function ───────────────────────────────────────────────────────
// Returns { matched: boolean, results: [{ type, passed, reason }] }
export async function judgeResponse({ output, prompt, rules }) {
  if (!rules || rules.length === 0) {
    return {
      matched: false,
      results: [{ type: 'none', passed: false, reason: 'No rules defined for this hole' }],
    };
  }

  const results = await Promise.all(
    rules.map(async rule => {
      const { passed, reason } = await judgeRule(rule, { output, prompt });
      return { type: rule.type, passed, reason };
    })
  );

  return {
    matched: results.every(r => r.passed),
    results,
  };
}

// ── Rule type registry ────────────────────────────────────────────────────────
// Used by the frontend hole-creation UI
export const RULE_TYPES = {
  regex:      { config: ['pattern', 'flags?'],  description: 'Output matches a regular expression. Use ^exact$ for exact match, ^val for starts with, val$ for ends with.' },
  quine:      { config: [],                     description: 'Output must equal the prompt itself' },
  word_count: { config: ['count'],              description: 'Output must be exactly N words' },
  max_words:  { config: ['count'],              description: 'Output must be at most N words' },
  min_words:  { config: ['count'],              description: 'Output must be at least N words' },
  char_count: { config: ['count'],              description: 'Output must be exactly N characters' },
  json_valid: { config: ['required_keys?'],     description: 'Output must be valid JSON, optionally with required keys' },
  llm:        { config: ['criteria'],           description: 'A second LLM judges the output against freeform criteria' },
};
