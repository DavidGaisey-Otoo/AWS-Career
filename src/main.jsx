import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

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
        await Promise.all(keys.filter((k) => !k.includes('v3-2026-06-launch')).map((k) => caches.delete(k)));
      }
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      await registration.update();
    } catch (err) {
      console.warn('[SW] registration skipped:', err);
    }
  });
}
