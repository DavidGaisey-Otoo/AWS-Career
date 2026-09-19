// The app itself is served from GitHub Pages; this Vercel deployment
// exists only to run these two functions, because Pages cannot.
const ALLOWED_ORIGINS = new Set([
  'https://davidgaisey-otoo.github.io',
]);

/**
 * Local development is allowed on ANY localhost port.
 *
 * Pinning exact ports here was a silent failure: the list named 5173
 * while vite.config.js serves 5273, so GitHub sign-in — and therefore
 * sync — could never complete during local development, with only an
 * opaque CORS error to show for it. Vite also falls back to the next
 * free port when its preferred one is busy, so any fixed list is one
 * busy port away from breaking again.
 *
 * This is safe: the device flow is useless without the user approving
 * the code on github.com, and anything running on the user's own machine
 * could call GitHub's API directly anyway — browser CORS is not what
 * stops it.
 */
const LOCAL_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN.test(origin);
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAllowedOrigin(req.headers.origin)) return res.status(403).json({ error: 'Origin not allowed' });

  const upstream = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: 'Iv23liIDYIruR09wkpWA' }),
  });
  const body = await upstream.json().catch(() => ({ error: 'invalid_response' }));
  return res.status(upstream.status).json(body);
}
