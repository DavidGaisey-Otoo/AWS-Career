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
    // Audit follow-up — split the heavy deps into their own chunks so the
    // initial app bundle stays small. Without this, the entry chunk was
    // 2 MB because @aws-sdk + html2pdf + framer-motion all landed in one
    // file that loads before anything renders.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // AWS SDK is huge (~1 MB) and only needed by Deploy + AWS
          // Account Manager flows. Lazy-routes already help, but co-locating
          // all aws-sdk packages in one chunk lets the browser cache it
          // once and reuse across pages.
          if (id.includes('@aws-sdk/')) return 'vendor-aws-sdk';
          // html2pdf pulls in jsPDF + html2canvas — ~1 MB combined. Only
          // used on PDF exports (notes, deploy reports, account setup).
          if (id.includes('html2pdf') || id.includes('jspdf') || id.includes('html2canvas')) {
            return 'vendor-pdf';
          }
          // Framer Motion — used everywhere but worth caching separately
          if (id.includes('framer-motion')) return 'vendor-motion';
          // React + ReactDOM + Router — core runtime, shared by every page
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('react-router')) {
            return 'vendor-react';
          }
          // Lucide icons — light but used on every page
          if (id.includes('lucide-react')) return 'vendor-icons';
          // Everything else from node_modules into a single vendor bundle
          return 'vendor';
        },
      },
    },
    // Bumped because @aws-sdk alone is ~1 MB and we want to suppress
    // the warning for chunks we've deliberately not split further.
    chunkSizeWarningLimit: 1200,
  },
});
