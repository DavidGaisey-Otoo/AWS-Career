import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { isStaleChunkError, recoverStaleChunk } from './lib/lazyWithRecovery.js';

// Non-route dynamic imports (PDF export, search data, AWS SDK actions) can
// encounter the same old-tab/new-deploy mismatch. Recover those globally too.
window.addEventListener('unhandledrejection', (event) => {
  if (isStaleChunkError(event.reason)) recoverStaleChunk(event.reason);
});

// Remove the pre-React fallback splash before mounting. If React fails
// during render, ErrorBoundary will show its own error UI.
try {
  const fb = document.getElementById('bootstrap-fallback');
  if (fb) fb.remove();
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* basename uses Vite's import.meta.env.BASE_URL — '/' in dev, '/AWS-Career/' on Pages.
        BASE_URL has a trailing slash; React Router wants none, so trim it. */}
    <BrowserRouter
      basename={import.meta.env.BASE_URL.replace(/\/$/, '')}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Service worker registration — defensive version.
// On first registration, sweep any OLD caches from previous deploys to
// avoid the "blank page" issue where a stale SW served broken assets.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      // Nuke any caches the browser may be holding (from earlier failed
      // deploys, an earlier dev server, etc.). Cheap and safe.
      if (window.caches?.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith('awscl-app-') && !k.includes('v5-2026-08-release-recovery')).map((k) => caches.delete(k)));
      }
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      await registration.update();
    } catch (err) {
      console.warn('[SW] registration skipped:', err);
    }
  });
}
