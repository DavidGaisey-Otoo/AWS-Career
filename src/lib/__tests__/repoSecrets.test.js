import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * repoSecrets.test.js — nothing identifying goes into a public repository.
 *
 * This repository is public. Two real AWS account numbers had already
 * reached it: one in a CLI example on the account-setup checklist, and
 * one I put there myself, using the owner's actual account as fixture
 * data for a secret scanner. The irony of that did not make it safer.
 *
 * An account number is not a credential, but it is the first thing an
 * attacker needs and it cannot be rotated. The same goes for a live
 * access key id, a GitHub token or a private key — those are worse.
 *
 * This checks the tracked working tree only. It cannot see git history,
 * which is a separate job needing a rewrite.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Account numbers AWS itself uses in documentation. */
const DOCUMENTED_EXAMPLES = new Set([
  '123456789012', '111122223333', '444455556666', '555555555555',
  '000000000000', '012345678901', '210987654321',
]);

/**
 * A scanner that cries wolf gets switched off, so the things it is known
 * to misread are listed rather than argued about case by case. Every one
 * of these was a real false positive on the first run.
 */
const ALLOWED = {
  // AWS publishes this secret key throughout its own documentation.
  secretKey: /wJalrXUtnFEMI\/K7MDENG\/bPxRfiCYEXAMPLEKEY/,
  // Placeholder inboxes in help text and input placeholders.
  email: /^(you|your\.?name|name|someone|dave|user|example|firstname\.lastname)@/i,
};

/** Access keys published in AWS's own docs, safe to appear in fixtures. */
const EXAMPLE_KEY = /^AKIA(IOSFODNN7EXAMPLE|EXAMPLE|ABCDEFGHIJKLMNOP|EXAMPLEEXAMPLEXX)/;

function trackedFiles() {
  return execSync('git ls-files', { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => /\.(js|jsx|ts|tsx|json|md|ya?ml|html|txt|sh)$/i.test(f));
}

function read(file) {
  try { return readFileSync(file, 'utf8'); } catch { return ''; }
}

export function runRepoSecretsTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  const files = trackedFiles();

  test('the repository has files to check', () => {
    assert(files.length > 50, `only ${files.length} tracked files found — the scan is not running`);
  });

  test('no real AWS account number is committed', () => {
    const offenders = [];
    for (const file of files) {
      // This file necessarily contains example account numbers.
      if (file.endsWith('repoSecrets.test.js')) continue;
      // A phone number is twelve digits too. "+233244112233" is a dialling
      // code, not an account, and flagging it teaches people to ignore this.
      for (const match of read(file).match(/(?<![+\d])\d{12}(?!\d)/g) || []) {
        if (!DOCUMENTED_EXAMPLES.has(match)) offenders.push(`${file}: ${match.slice(0, 4)}…`);
      }
    }
    assert(offenders.length === 0,
      'account numbers that are not documentation examples:\n  ' + offenders.slice(0, 6).join('\n  '));
  });

  test('no live-looking AWS access key is committed', () => {
    const offenders = [];
    for (const file of files) {
      if (file.endsWith('repoSecrets.test.js')) continue;
      for (const match of read(file).match(/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g) || []) {
        if (!EXAMPLE_KEY.test(match)) offenders.push(`${file}: ${match.slice(0, 8)}…`);
      }
    }
    assert(offenders.length === 0, 'access key ids that are not AWS examples:\n  ' + offenders.join('\n  '));
  });

  test('no secret access key, token or private key is committed', () => {
    const patterns = [
      [/aws_secret_access_key\s*=\s*\S{20,}/i, 'an AWS secret access key'],
      [/\bghp_[A-Za-z0-9]{30,}\b/, 'a GitHub personal access token'],
      [/\bgithub_pat_[A-Za-z0-9_]{50,}\b/, 'a fine-grained GitHub token'],
      [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'a private key'],
      [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, 'a Slack token'],
    ];
    const offenders = [];
    for (const file of files) {
      if (file.endsWith('repoSecrets.test.js')) continue;
      const text = read(file);
      if (ALLOWED.secretKey.test(text)) continue;
      for (const [re, label] of patterns) if (re.test(text)) offenders.push(`${file}: ${label}`);
    }
    assert(offenders.length === 0, 'secrets in tracked files:\n  ' + offenders.join('\n  '));
  });

  test('the owner’s personal email addresses are not committed', () => {
    // A name in a portfolio is deliberate. An inbox is not.
    const offenders = [];
    for (const file of files) {
      if (file.endsWith('repoSecrets.test.js')) continue;
      const found = read(file).match(/\b[\w.+-]+@(?:gmail|outlook|hotmail|yahoo|icloud)\.com\b/gi) || [];
      if (found.some((address) => !ALLOWED.email.test(address))) offenders.push(file);
    }
    assert(offenders.length === 0, 'personal email addresses in:\n  ' + offenders.join('\n  '));
  });

  test('the document folders are ignored, not tracked', () => {
    const tracked = files.filter((f) => /^(documentation|evidence)\//.test(f));
    assert(tracked.length === 0, 'private document folders are tracked again:\n  ' + tracked.join('\n  '));
  });

  return { allPassed: results.every((r) => r.pass), results };
}
