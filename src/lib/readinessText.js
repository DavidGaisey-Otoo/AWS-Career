/**
 * readinessText.js — read a readiness entry as a sentence.
 *
 * assessDeliveryReadiness() produces structured records, not strings:
 *
 *   assumption  { id, statement, status, source }
 *   unsupported { serviceId, reason }
 *
 * Solution Studio renders `.statement` and gets it right. The workspace
 * viewer and the client report rendered the record itself, so a client
 * report listed seven assumptions reading "[object Object]" — in the one
 * document meant to go to a paying client.
 *
 * Older saved solutions hold bare strings, so both forms are accepted.
 * Anything unreadable returns null and the caller drops it, because an
 * empty bullet is better than a bullet saying [object Object].
 */

const clean = (value) => {
  const text = String(value ?? '').trim();
  return text && text !== '[object Object]' ? text : null;
};

/** An assumption, as a sentence. */
export function assumptionText(entry) {
  if (entry == null) return null;
  if (typeof entry === 'string') return clean(entry);
  return clean(entry.statement) || clean(entry.text) || clean(entry.question) || null;
}

/** A claim the evidence does not support, as a sentence. */
export function unsupportedText(entry) {
  if (entry == null) return null;
  if (typeof entry === 'string') return clean(entry);
  const service = clean(entry.serviceId) || clean(entry.service);
  const reason = clean(entry.reason) || clean(entry.detail) || clean(entry.statement);
  if (service && reason) return `${service} — ${reason}`;
  return reason || service || null;
}

/** Map a list through one of the above, dropping anything unreadable. */
export const readableList = (items, read) =>
  (Array.isArray(items) ? items : []).map(read).filter(Boolean);
