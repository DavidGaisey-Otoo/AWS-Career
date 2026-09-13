import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
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
  sessionStorage.removeItem('awscl-startup-repair-attempted');
} catch {}

// GitHub Pages cannot return HTTP 200 for arbitrary SPA paths. Hash routing
// keeps every shareable application URL on the real, successful document URL
// (`/AWS-Career/#/solution`) while retaining client-side navigation.
// Redirect old BrowserRouter links once so existing bookmarks keep working.
const pagesBase = import.meta.env.BASE_URL;
const relativePath = pagesBase !== '/' && window.location.pathname.startsWith(pagesBase)
  ? window.location.pathname.slice(pagesBase.length - 1)
  : '';
const shouldRedirectLegacyRoute = import.meta.env.PROD
  && pagesBase !== '/'
  && relativePath
  && relativePath !== '/'
  && !window.location.hash;

if (shouldRedirectLegacyRoute) {
  const query = window.location.search || '';
  window.location.replace(`${pagesBase}#${relativePath}${query}`);
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </HashRouter>
    </React.StrictMode>
  );
}

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
        await Promise.all(keys.filter((k) => k.startsWith('awscl-app-') && !k.includes('v6-2026-08-startup-recovery')).map((k) => caches.delete(k)));
      }
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      await registration.update();
    } catch (err) {
      console.warn('[SW] registration skipped:', err);
    }
  });
}
