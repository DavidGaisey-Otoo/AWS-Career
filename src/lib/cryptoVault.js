/**
 * cryptoVault.js — Browser-only AES-GCM 256 vault for sensitive secrets.
 *
 * Why this exists:
 *   Storing AWS keys (or any high-value credential) in localStorage as
 *   plain text means any browser extension or page script in the same
 *   origin can read them. This module wraps secrets in an encrypted blob
 *   that is useless without the user's deploy password.
 *
 * Algorithm:
 *   - Key derivation:  PBKDF2(SHA-256, 220,000 iterations, 16-byte random salt)
 *   - Encryption:      AES-GCM 256 with 12-byte random IV
 *   - Persisted shape: { v, salt, iv, ct } — all base64, no plaintext anywhere
 *
 * Security model:
 *   The deploy password is NEVER stored. It is only ever held in JS memory
 *   for the lifetime of a single unlock() / encrypt() / decrypt() call.
 *   Callers should not cache the password — re-prompt for each sensitive
 *   action. See DeployContext.jsx for the canonical usage pattern.
 *
 *   Threat coverage:
 *     ✅ Stops "drive-by" localStorage reads from extensions/other scripts
 *     ✅ Stops casual access on a shared/lost machine
 *     ✅ Stops accidental git commits of localStorage dumps
 *     ❌ Does NOT stop a keylogger or a compromised browser (nothing in JS can)
 *     ❌ Does NOT stop a user who tells someone their password
 *
 *   Use the panic killswitch (wipe(...)) at the slightest suspicion.
 */

const VAULT_VERSION = 1;
const PBKDF2_ITERATIONS = 220_000;
const KEY_LEN_BITS = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;

// ---------------- base64 helpers ----------------

function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBuf(b64) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}

// ---------------- key derivation ----------------

async function deriveKey(password, salt) {
  if (!password || typeof password !== 'string') {
    throw new Error('Vault: password must be a non-empty string.');
  }
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    base,
    { name: 'AES-GCM', length: KEY_LEN_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

// ---------------- public API ----------------

/**
 * Encrypt any JSON-serialisable value with `password`.
 * Returns a vault blob (object) safe to JSON.stringify and persist.
 */
export async function encrypt(plain, password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const data = enc.encode(JSON.stringify(plain));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return {
    v: VAULT_VERSION,
    salt: bufToB64(salt),
    iv: bufToB64(iv),
    ct: bufToB64(ct),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Decrypt a vault blob with `password`. Throws if password is wrong or
 * the blob is corrupted/tampered (AES-GCM provides integrity check).
 */
export async function decrypt(blob, password) {
  if (!blob || typeof blob !== 'object' || !blob.ct) {
    throw new Error('Vault: malformed blob.');
  }
  if (blob.v !== VAULT_VERSION) {
    throw new Error(`Vault: unsupported version (${blob.v}). Expected ${VAULT_VERSION}.`);
  }
  const salt = new Uint8Array(b64ToBuf(blob.salt));
  const iv = new Uint8Array(b64ToBuf(blob.iv));
  const ct = b64ToBuf(blob.ct);
  const key = await deriveKey(password, salt);
  let plain;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  } catch (_err) {
    throw new Error('Vault: wrong password or blob has been tampered with.');
  }
  const dec = new TextDecoder();
  try {
    return JSON.parse(dec.decode(plain));
  } catch (_e) {
    throw new Error('Vault: decrypted payload is not valid JSON.');
  }
}

/**
 * Verify a password against an existing vault blob without returning
 * the plaintext. Useful for "unlock screen" flows.
 */
export async function verify(blob, password) {
  try {
    await decrypt(blob, password);
    return true;
  } catch {
    return false;
  }
}

/**
 * Re-encrypt an existing blob with a NEW password (password rotation).
 * Old blob is decrypted with old password, then re-encrypted with new.
 */
export async function rotate(blob, oldPassword, newPassword) {
  const plain = await decrypt(blob, oldPassword);
  return encrypt(plain, newPassword);
}

/**
 * Estimate password strength on a 0–4 scale (zxcvbn-like, but lightweight).
 * Used to warn the user during password creation, never to silently reject.
 */
export function passwordStrength(pw) {
  if (!pw) return { score: 0, label: 'empty', warning: 'Required.' };
  const len = pw.length;
  let score = 0;
  if (len >= 8) score++;
  if (len >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (len >= 16) score = Math.min(4, score + 1);
  const labels = ['very weak', 'weak', 'fair', 'strong', 'excellent'];
  const warnings = [
    'Too short — use at least 12 characters.',
    'Weak — mix upper, lower, digits and a symbol.',
    'Fair — consider adding length or another character class.',
    'Strong — good to use.',
    'Excellent — well above recommended.',
  ];
  return { score, label: labels[score], warning: warnings[score] };
}

/**
 * Wipe a vault blob from a localStorage key. Used by the panic killswitch.
 * Does NOT touch the AWS account itself — caller is responsible for
 * rotating the access keys via the AWS console after wiping.
 */
export function wipe(localStorageKey) {
  try {
    localStorage.removeItem(localStorageKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Quick environment check — verifies SubtleCrypto + a secure context.
 * Returns { ok, reason }. The vault refuses to run otherwise.
 */
export function envOK() {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return { ok: false, reason: 'SubtleCrypto unavailable. Use Chrome / Edge / Firefox over HTTPS or localhost.' };
  }
  // Some browsers expose crypto.subtle only on secure origins.
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return { ok: false, reason: 'Insecure origin. Vault refuses to run outside HTTPS / localhost.' };
  }
  return { ok: true };
}
