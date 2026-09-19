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

export default defineConfig({
  base,
  define: { __BUILD_STAMP__: JSON.stringify(BUILD_STAMP) },
  plugins: [react()],
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
