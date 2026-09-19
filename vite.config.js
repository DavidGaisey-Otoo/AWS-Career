import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves at /<repo>/ rather than /. Set the base path
// only when the GH Actions workflow sets DEPLOY_TARGET=github-pages.
// Local dev + Vercel + other hosts remain at '/'.
const base = process.env.DEPLOY_TARGET === 'github-pages' ? '/AWS-Career/' : '/';

/**
 * Build stamp — so a running window can say WHICH build it is.
 *
 * This app deploys to more than one origin (GitHub Pages, Vercel, local
 * dev), and each origin keeps its own localStorage. Two windows can
 * therefore show different data and different builds with nothing on
 * screen to tell them apart, which makes "did my change land?"
 * unanswerable. Stamping the commit and target at build time answers it.
 */
function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

const BUILD_STAMP = {
  sha:
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.GITHUB_SHA?.slice(0, 7) ||
    gitSha(),
  builtAt: new Date().toISOString(),
  target:
    process.env.DEPLOY_TARGET === 'github-pages'
      ? 'GitHub Pages'
      : process.env.VERCEL
        ? 'Vercel'
        : 'local',
};

/**
 * Receives the browser's localStorage snapshot and writes it to disk.
 *
 * `apply: 'serve'` means this endpoint exists only under `npm run dev`.
 * It is not part of any build and cannot reach a deployed site.
 *
 * It exists because localStorage on a dev-server origin is a fragile
 * home for real work — one cleared browser and it is gone, with no copy
 * anywhere. The app's Export button does the same job, but only if
 * someone remembers to press it.
 */
function localBackupPlugin() {
  return {
    name: 'local-backup',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__local-backup', (req, res, next) => {
        if (req.method !== 'POST') return next();

        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', async () => {
          try {
            const body = Buffer.concat(chunks).toString('utf8');
            const parsed = JSON.parse(body);
            const { mkdir, writeFile } = await import('node:fs/promises');
            const path = await import('node:path');

            const dir = path.resolve(process.cwd(), 'local-backups');
            await mkdir(dir, { recursive: true });
            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            const origin = String(parsed.origin || 'unknown').replace(/[^a-z0-9]+/gi, '-');
            const file = path.join(dir, `backup-${origin}-${stamp}.json`);
            await writeFile(file, JSON.stringify(parsed, null, 2), 'utf8');

            // Also keep a stable "latest" copy that is easy to find.
            await writeFile(path.join(dir, 'latest.json'), JSON.stringify(parsed, null, 2), 'utf8');

            server.config.logger.info(
              `[local-backup] ${parsed.keyCount} keys from ${parsed.origin} → local-backups/${path.basename(file)}`
            );
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, file: `local-backups/${path.basename(file)}` }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  base,
  define: { __BUILD_STAMP__: JSON.stringify(BUILD_STAMP) },
  plugins: [react(), localBackupPlugin()],
  server: {
    port: 5273,
    strictPort: false,
    open: true,
  },
  build: {
    // Let Vite/Rollup do its own chunk splitting. Earlier I had a
    // manualChunks config that split @aws-sdk + html2pdf + framer-motion
    // into separate chunks for caching wins, but the AWS SDK has internal
    // circular deps that broke initialization order when forced into a
    // separate chunk ("Cannot access 'xte' before initialization").
    //
    // Default chunking = larger initial bundle but no TDZ errors.
    // Optimization can come back later with careful per-route lazy loading.
    chunkSizeWarningLimit: 2500,
  },
});
