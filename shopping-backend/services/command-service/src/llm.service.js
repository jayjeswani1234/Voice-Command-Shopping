// Turns free-form shopping commands ("add two bottles of milk") into a
// structured intent. If ANTHROPIC_API_KEY is set, delegates to Claude for
// robust parsing; otherwise falls back to a lightweight regex parser so the
// service still runs out of the box with zero configuration.

const INTENT_KEYWORDS = {
  REMOVE: ['remove', 'delete', 'take off'],
  COMPLETE: ['bought', 'purchased', 'got', 'done with'],
  ADD: ['add', 'buy', 'need', 'get'],
};

const UNIT_PATTERN = /\b(bottles?|cans?|bags?|boxes?|packs?|kg|liters?|litres?)\b/;
const FILLER_WORDS = /\b(add|buy|need|get|remove|delete|take off|bought|purchased|got|done with|of)\b/g;

function regexParse(text) {
  const lower = text.toLowerCase();

  let intent = 'ADD';
  for (const [key, words] of Object.entries(INTENT_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) {
      intent = key;
      break;
    }
  }

  const quantityMatch = lower.match(/\b(\d+)\b/);
  const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : 1;

  const unitMatch = lower.match(UNIT_PATTERN);
  const unit = unitMatch ? unitMatch[1].replace(/s$/, '') : null;

  const name = lower
    .replace(FILLER_WORDS, '')
    .replace(/\b\d+\b/g, '')
    .replace(unitMatch ? unitMatch[0] : '', '')
    .trim();

  return { intent, item: { name: name || 'item', quantity, unit } };
}

async function callClaude(text) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
      max_tokens: 200,
      system:
        'Extract a shopping-list intent from the user message. ' +
        'Reply with ONLY JSON, no prose, no markdown fences: ' +
        '{"intent":"ADD|REMOVE|COMPLETE","item":{"name":string,"quantity":number,"unit":string|null}}',
      messages: [{ role: 'user', content: text }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text?.trim() || '';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

async function parseCommand(text) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return regexParse(text);
  }

  try {
    return await callClaude(text);
  } catch (err) {
    console.error('LLM parse failed, falling back to regex parser:', err.message);
    return regexParse(text);
  }
}

module.exports = { parseCommand, regexParse };
