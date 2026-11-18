// Keeps the local dev server up: starts Vite on the fixed port and restarts
// it whenever it exits. Launched at Windows logon by the Startup-folder entry
// that scripts/installKeepAlive.ps1 creates; also runnable directly with
// `npm run serve:always`.
//
// If something is already answering on the port (another copy of this
// supervisor, or a dev server you started by hand) it waits instead of
// starting a second one, so it never fights you for the port.

import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 5273;
const LOG_DIR = path.join(ROOT, 'tmp');
const LOG = path.join(LOG_DIR, 'keep-alive.log');
const CHECK_MS = 30_000;
const MAX_BACKOFF_MS = 60_000;

mkdirSync(LOG_DIR, { recursive: true });
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try { appendFileSync(LOG, line); } catch { /* logging must never kill the supervisor */ }
};

function portInUse(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host: '127.0.0.1' });
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => resolve(false));
    sock.setTimeout(2000, () => { sock.destroy(); resolve(false); });
  });
}

let backoff = 1000;
let child = null;

async function startOrWait() {
  if (child) return;
  if (await portInUse(PORT)) {
    setTimeout(startOrWait, CHECK_MS);
    return;
  }
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  log(`starting Vite on http://localhost:${PORT}/`);
  const startedAt = Date.now();
  child = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort', '--open', 'false'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.on('data', (d) => { try { appendFileSync(LOG, d); } catch { /* ignore */ } });
  child.stderr.on('data', (d) => { try { appendFileSync(LOG, d); } catch { /* ignore */ } });
  child.on('exit', (code, signal) => {
    child = null;
    // A run that stayed up a while was healthy, so reset the backoff.
    if (Date.now() - startedAt > 60_000) backoff = 1000;
    log(`Vite exited (code ${code}, signal ${signal}); restarting in ${backoff / 1000}s`);
    setTimeout(startOrWait, backoff);
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
  });
}

const stop = () => { if (child) child.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

log('keep-alive supervisor started');
startOrWait();
