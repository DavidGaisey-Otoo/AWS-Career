const SECRET_FIELD = /(?:secret|password|token|credential|authorization|private.?key|access.?key)/i;

/** Keep persisted deployment evidence useful without storing secrets or payload bodies. */
export function sanitizeAuditValue(value, key = '', seen = new WeakSet()) {
  if (SECRET_FIELD.test(key)) return '[REDACTED]';
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') {
    return value
      .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED-ACCESS-KEY]')
      .replace(/\b[A-Za-z0-9/+=]{40}\b/g, '[REDACTED-SECRET]')
      .slice(0, 4000);
  }
  if (typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => sanitizeAuditValue(item, key, seen));
  if (value instanceof Uint8Array || value instanceof ArrayBuffer || (typeof Blob !== 'undefined' && value instanceof Blob)) {
    return '[BINARY-OMITTED]';
  }
  const out = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    if (/^(?:body|zipFile|files)$/i.test(childKey)) out[childKey] = '[CONTENT-OMITTED]';
    else out[childKey] = sanitizeAuditValue(childValue, childKey, seen);
  }
  return out;
}

/** Success is valid only when the executor explicitly supplies ok:true evidence. */
export function assertVerifiedResult(result, actionId = 'AWS action') {
  if (!result || result.ok !== true) {
    throw new Error(result?.error || `${actionId} did not return verified success evidence.`);
  }
  return result;
}
