/**
 * clientVoice.js — turning what a client wrote into what you say back.
 *
 * Briefs are written by the client: "Hi, I run a bakery. We need our
 * website moved to AWS." Pasted straight into a proposal that reads
 * "I understand you need we need our website…" — and once lowercased,
 * "aws". These helpers strip the greeting, find the sentence that says
 * what they need, and turn it round to "your website moved to AWS".
 */

const GREETING = /^\s*(?:hi|hello|hey|dear|good\s+(?:morning|afternoon|evening)|greetings)\b[^.!?\n,]*[,.!:\n-]?\s*/i;

/** Drop a leading "Hi there," / "Hello team!" so it never becomes a title. */
export function stripGreeting(text = '') {
  return String(text || '').replace(GREETING, '').trim();
}

/** Split into sentences and lines, greeting removed. */
export function sentences(text = '') {
  return stripGreeting(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const NEED = /^(?:so\s+|basically\s+)?(?:(?:we|i)(?:'re| are| am|'m)?\s+)?(?:really\s+)?(?:need|want|require|would like|'d like|looking for|seeking)\s+(?:to\s+(?:have|get)\s+|help\s+(?:with|to)\s+)?/i;
/** "an AWS expert to …", "someone who can …" — the person, not the need. */
const HIRE = /^(?:an?\s+|some\s+)?(?:[\w-]+\s+){0,3}?(?:someone|expert|engineer|developer|freelancer|consultant|architect|specialist|professional|person|help)\s+(?:who\s+can\s+|to\s+|for\s+)/i;

/** The sentence where the client says what they need, if there is one. */
export function needSentence(text = '') {
  return sentences(text).find((s) => NEED.test(s) || /\b(?:need|want|looking for|require)\b/i.test(s)) || null;
}

/**
 * First person → second person, word by word, keeping capitals of
 * everything else (AWS stays AWS).
 */
export function toSecondPerson(s = '') {
  const map = { we: 'you', us: 'you', our: 'your', ours: 'yours', i: 'you', me: 'you', my: 'your', mine: 'yours', "i'm": "you're", "we're": "you're", "i've": "you've", "we've": "you've" };
  return String(s).replace(/\b(?:i'm|we're|i've|we've|we|us|our|ours|i|me|my|mine)\b/gi, (w) => {
    const r = map[w.toLowerCase()];
    return w[0] === w[0].toUpperCase() && w.toLowerCase() !== 'i' ? r[0].toUpperCase() + r.slice(1) : r;
  });
}

/**
 * What the client needs, ready to follow "you need …":
 * "We need our website moved to AWS." → "your website moved to AWS".
 * Falls back to the cleaned sentence when there is no "we need".
 */
export function clientNeed(text = '', max = 110) {
  const sentence = needSentence(text) || sentences(text)[0] || '';
  let s = sentence.replace(NEED, '').replace(HIRE, '').replace(/[.!?]+$/, '').trim();
  s = toSecondPerson(s);
  if (s.length > max) s = s.slice(0, max).replace(/\s\S*$/, '') + '…';
  // Lowercase only the first letter, and only if it is an ordinary word.
  return /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}

/** Whole-word (or whole-phrase) match, so "eks" is not found in "weeks". */
export function mentions(text = '', term = '') {
  const esc = String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(String(text));
}
