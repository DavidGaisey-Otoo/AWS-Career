/**
 * Minimal GitHub REST client — uses plain fetch (no SDK dependency).
 *
 * Just enough to:
 *   - Verify the PAT works (whoami)
 *   - Create a repo
 *   - Upload multiple files (text + base64 binary)
 *   - Add searchable repo topics
 *
 * Token scopes required (classic PAT):
 *   - `repo` (public repos) or `public_repo` for public-only
 * Fine-grained PAT permissions:
 *   - "Contents" — read+write, "Metadata" — read, "Administration" — write (to create repos)
 */

const GH_API = 'https://api.github.com';
const HEADERS = (token) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
});

/** Verify the PAT — returns { ok, user: { login, name, avatar_url }, message }. */
export async function whoAmI(token) {
  if (!token) return { ok: false, message: 'No token provided.' };
  try {
    const res = await fetch(`${GH_API}/user`, { headers: HEADERS(token) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, message: body.message || `HTTP ${res.status}` };
    }
    const user = await res.json();
    return { ok: true, user, message: `Authenticated as ${user.login}` };
  } catch (err) {
    return { ok: false, message: (err && err.message) || String(err) };
  }
}

/**
 * Push a complete portfolio repo from scratch.
 *
 * @param {object} args
 *  - token        : GitHub PAT (string)
 *  - repoName     : kebab-case repo name
 *  - description  : short repo description (≤350 chars)
 *  - topics       : array of lowercase topic strings (e.g. ['aws', 's3', 'cloudfront'])
 *  - isPublic     : boolean (default true)
 *  - files        : array of { path, content, isBinary }
 *      content for text files is plain string;
 *      content for binary files (PNG/SVG dataURL etc.) is the base64 body (no data: prefix).
 *  - onProgress   : (stage, message) callback — fires per major step + per file
 *
 * @returns { ok, html_url, full_name, files: [{path, sha, status}], errors }
 */
export async function pushPortfolioRepo({
  token,
  repoName,
  description = '',
  topics = [],
  isPublic = true,
  files = [],
  onProgress = () => {},
}) {
  // 1. whoami → owner
  onProgress('auth', 'Verifying GitHub token…');
  const me = await whoAmI(token);
  if (!me.ok) return { ok: false, errors: [{ stage: 'auth', message: me.message }] };
  const owner = me.user.login;

  // 2. Create repo (or 422 = already exists)
  onProgress('create-repo', `Creating ${owner}/${repoName}…`);
  const createRes = await fetch(`${GH_API}/user/repos`, {
    method: 'POST',
    headers: { ...HEADERS(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: repoName,
      description: (description || '').slice(0, 350),
      private: !isPublic,
      auto_init: true, // creates main branch + initial commit so we can PUT files
    }),
  });

  let repo;
  if (createRes.ok) {
    repo = await createRes.json();
  } else if (createRes.status === 422) {
    // Repo already exists — fetch its metadata so we can push into it
    onProgress('create-repo', 'Repo exists — pushing into existing repo.');
    const existing = await fetch(`${GH_API}/repos/${owner}/${repoName}`, { headers: HEADERS(token) });
    if (!existing.ok) {
      const body = await existing.json().catch(() => ({}));
      return { ok: false, errors: [{ stage: 'create-repo', message: body.message || `HTTP ${existing.status}` }] };
    }
    repo = await existing.json();
  } else {
    const body = await createRes.json().catch(() => ({}));
    return { ok: false, errors: [{ stage: 'create-repo', message: body.message || `HTTP ${createRes.status}` }] };
  }

  // 3. PUT each file (overwrites on conflict)
  const fileResults = [];
  const errors = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    onProgress('push-file', `(${i + 1}/${files.length}) ${f.path}`);

    // If file exists already, we need its current SHA to overwrite
    let sha;
    try {
      const getRes = await fetch(`${GH_API}/repos/${owner}/${repoName}/contents/${encodeURIComponent(f.path)}`, {
        headers: HEADERS(token),
      });
      if (getRes.ok) {
        const existing = await getRes.json();
        sha = existing.sha;
      }
    } catch { /* ignore — file doesn't exist yet */ }

    const content = f.isBinary
      ? f.content
      : (typeof window !== 'undefined' && window.btoa
          ? window.btoa(unescape(encodeURIComponent(f.content)))
          : Buffer.from(f.content, 'utf-8').toString('base64'));

    const putRes = await fetch(`${GH_API}/repos/${owner}/${repoName}/contents/${encodeURIComponent(f.path)}`, {
      method: 'PUT',
      headers: { ...HEADERS(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Add ${f.path}`,
        content,
        ...(sha ? { sha } : {}),
      }),
    });
    if (putRes.ok) {
      const data = await putRes.json();
      fileResults.push({ path: f.path, sha: data.content?.sha, status: sha ? 'updated' : 'created' });
    } else {
      const body = await putRes.json().catch(() => ({}));
      errors.push({ stage: 'push-file', path: f.path, message: body.message || `HTTP ${putRes.status}` });
    }
  }

  // 4. Apply repo topics for searchability (best-effort)
  if (topics.length > 0) {
    onProgress('set-topics', `Setting topics: ${topics.join(', ')}`);
    try {
      const t = topics
        .map((x) => String(x).toLowerCase().replace(/[^a-z0-9-]/g, '-'))
        .filter(Boolean)
        .slice(0, 20);
      await fetch(`${GH_API}/repos/${owner}/${repoName}/topics`, {
        method: 'PUT',
        headers: { ...HEADERS(token), 'Content-Type': 'application/json', Accept: 'application/vnd.github.mercy-preview+json' },
        body: JSON.stringify({ names: t }),
      });
    } catch { /* non-fatal */ }
  }

  onProgress('done', `Pushed ${fileResults.length} files`);
  return {
    ok: errors.length === 0,
    html_url: repo.html_url,
    full_name: repo.full_name,
    files: fileResults,
    errors,
  };
}

/** Suggest a sensible repo name from a project title. */
export function suggestRepoName(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || `aws-project-${Date.now().toString(36)}`;
}

/** Convert a data URL (e.g. screenshots stored in localStorage) to base64. */
export function dataUrlToBase64(dataUrl) {
  if (!dataUrl) return null;
  const i = dataUrl.indexOf('base64,');
  return i === -1 ? null : dataUrl.slice(i + 'base64,'.length);
}
