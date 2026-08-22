import { assertVerifiedResult, sanitizeAuditValue } from '../deploySafety.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runDeploySafetyTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test('audit redacts credential fields and embedded AWS keys', () => {
    const safe = sanitizeAuditValue({
      password: 'do-not-store',
      nested: { sessionToken: 'token', note: 'key AKIAABCDEFGHIJKLMNOP used' },
      files: [{ name: 'secret.zip', body: 'payload' }],
    });
    const encoded = JSON.stringify(safe);
    assert(safe.password === '[REDACTED]', 'password field was retained');
    assert(safe.nested.sessionToken === '[REDACTED]', 'session token was retained');
    assert(encoded.includes('[REDACTED-ACCESS-KEY]'), 'embedded AWS access key was retained');
    assert(safe.files === '[CONTENT-OMITTED]', 'file payload was retained');
  });

  test('executor result fails closed without explicit ok:true', () => {
    for (const value of [null, undefined, {}, { ok: false, error: 'failed' }]) {
      let threw = false;
      try { assertVerifiedResult(value, 'test.action'); } catch { threw = true; }
      assert(threw, `accepted unverified result: ${JSON.stringify(value)}`);
    }
    const good = { ok: true, evidence: { source: 'aws' } };
    assert(assertVerifiedResult(good) === good, 'rejected explicit success');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
