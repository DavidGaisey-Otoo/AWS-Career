import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves at /<repo>/ rather than /. Set the base path
// only when the GH Actions workflow sets DEPLOY_TARGET=github-pages.
// Local dev + Vercel + other hosts remain at '/'.
const base = process.env.DEPLOY_TARGET === 'github-pages' ? '/AWS-Career/' : '/';

export default defineConfig({
  base,
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
