// The app itself is served from GitHub Pages; this Vercel deployment
// exists only to run these two functions, because Pages cannot.
// The dev-server ports must match vite.config.js (port 5273) — they did
// not, which silently broke GitHub sign-in during local development.
const ALLOWED_ORIGINS = new Set([
  'https://davidgaisey-otoo.github.io',
  'http://localhost:5273',
  'http://127.0.0.1:5273',
  // Vite falls back to the next free port when 5273 is taken.
  'http://localhost:5274',
  'http://127.0.0.1:5274',
]);

function cors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!ALLOWED_ORIGINS.has(req.headers.origin)) return res.status(403).json({ error: 'Origin not allowed' });

  const { device_code, refresh_token, grant_type } = req.body || {};
  if (!device_code && !refresh_token) return res.status(400).json({ error: 'Missing authorization code' });
  const payload = refresh_token
    ? { client_id: 'Iv23liIDYIruR09wkpWA', refresh_token, grant_type: grant_type || 'refresh_token' }
    : { client_id: 'Iv23liIDYIruR09wkpWA', device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' };

  const upstream = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await upstream.json().catch(() => ({ error: 'invalid_response' }));
  return res.status(upstream.status).json(body);
}
