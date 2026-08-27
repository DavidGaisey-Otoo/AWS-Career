const UNSUPPORTED_CLAIM_RULES = [
  { id: 'certification', pattern: /\b(?:i(?:'m| am)|we are)\s+(?:an?\s+)?aws[- ]certified\b|\bi hold (?:the |an? )?aws\b/i },
  { id: 'production-history', pattern: /\b(?:i(?:'ve| have)|we(?:'ve| have))\s+(?:built|shipped|delivered|led)\b[^.\n]{0,100}\b(?:production|client|enterprise|startup)\b/i },
  { id: 'years-experience', pattern: /\b(?:i have|with|someone with)\s+\d+\+?\s+years?\b/i },
  { id: 'guarantee', pattern: /\b(?:guarantee(?:d)?|zero risk|you don'?t pay|fully[- ]validated|proven working)\b/i },
  { id: 'unverified-observation', pattern: /\b(?:noticed|saw)\b[^.\n]{0,100}\b(?:you are|your team is|is scaling|running on)\b/i },
];

/**
 * Detect claims that require external evidence. Generated freelance copy must
 * not contain these claims unless a human deliberately replaces the draft
 * with evidence they can substantiate.
 */
export function findUnsupportedClaims(text) {
  const value = String(text || '');
  return UNSUPPORTED_CLAIM_RULES
    .filter(({ pattern }) => pattern.test(value))
    .map(({ id }) => id);
}

export function hasUnsupportedClaims(text) {
  return findUnsupportedClaims(text).length > 0;
}

