/**
 * connections.js — how the office is linked to everything around it.
 *
 * One list, read by Settings → Connections and by Today: your other
 * computer (through sync), GitHub, Google Calendar, the AWS vault, local
 * AI, draw.io, and the account controller app on this laptop.
 *
 * Statuses:
 *   connected — working, as far as this browser can see
 *   attention — set up but needs you (signed out, error, conflict, offline)
 *   off       — not set up
 *   separate  — deliberately not linked into the app (see its detail)
 *
 * A status is only ever what this browser can actually see. The vault is
 * "set up", not "connected to AWS": nothing here calls AWS to check.
 */

function ago(iso, now) {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (Number.isNaN(t)) return null;
  const mins = Math.max(0, Math.round((now - t) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

export function describeConnections(s = {}, now = Date.now()) {
  const out = [];
  const sync = s.sync || {};
  const meta = sync.meta || {};

  // Your other computer. Sync is the only path between desktop and laptop.
  {
    const last = ago(meta.lastPushAt && meta.lastPullAt
      ? (meta.lastPushAt > meta.lastPullAt ? meta.lastPushAt : meta.lastPullAt)
      : meta.lastPushAt || meta.lastPullAt, now);
    let status; let detail; let action;
    if (!sync.enabled) {
      status = 'off'; action = 'sync';
      detail = 'Your jobs, clients and money records live only in this browser. Turn on sync to have the same office on your desktop and your laptop.';
    } else if (sync.status === 'no-token') {
      status = 'attention'; action = 'github';
      detail = 'Sync is on but signed out of GitHub, so nothing is moving between your computers.';
    } else if (sync.status === 'conflict') {
      status = 'attention'; action = 'sync';
      detail = 'Your two computers changed the same data. Choose which copy to keep.';
    } else if (sync.status === 'error') {
      status = 'attention'; action = 'sync';
      detail = `The last sync failed${meta.lastError ? `: ${meta.lastError}` : ''}.`;
    } else {
      status = 'connected'; action = 'sync';
      detail = last ? `Last synced ${last}.` : 'On. Not synced yet on this computer.';
    }
    out.push({
      id: 'devices', label: 'Desktop ↔ laptop', status, detail, action,
      note: 'AWS keys never sync. Set up the vault on each computer you deploy from.',
    });
  }

  out.push(s.github?.signedIn
    ? { id: 'github', label: 'GitHub', status: 'connected', detail: 'Signed in. Used for sync, deploying apps from GitHub, and pushing portfolio repos.', action: 'github' }
    : { id: 'github', label: 'GitHub', status: 'off', detail: 'Not signed in. Needed for sync and for deploying apps from GitHub.', action: 'github' });

  {
    const g = s.google || {};
    out.push(g.connected
      ? { id: 'google', label: 'Google Calendar', status: 'connected', detail: 'Discovery calls and deadlines can go straight into your calendar.', action: 'google' }
      : g.clientIdSet
        ? { id: 'google', label: 'Google Calendar', status: 'attention', detail: 'Set up but not signed in.', action: 'google' }
        : { id: 'google', label: 'Google Calendar', status: 'off', detail: 'Not set up. Optional: books discovery calls into your calendar.', action: 'google' });
  }

  out.push(s.vault?.exists
    ? { id: 'aws', label: 'AWS (encrypted vault)', status: 'connected', detail: 'Keys saved, encrypted, on this computer. Locked until you enter your password; not checked against AWS from here.', action: 'aws' }
    : { id: 'aws', label: 'AWS (encrypted vault)', status: 'off', detail: 'No AWS keys on this computer. Needed to deploy and to see what is running.', action: 'aws' });

  out.push(s.localAI?.enabled
    ? { id: 'local-ai', label: 'Local AI (Ollama)', status: 'connected', detail: 'Turned on. Only reachable when the app itself runs on this computer (localhost), not from the installed web app.', action: 'local-ai' }
    : { id: 'local-ai', label: 'Local AI (Ollama)', status: 'off', detail: 'Off. Optional: free, private AI that runs on your own computer.', action: 'local-ai' });

  if (s.online === false) {
    out.push({ id: 'drawio', label: 'draw.io', status: 'attention', detail: 'Built in, but this computer is offline and the editor loads from diagrams.net.', action: 'drawio' });
  } else {
    out.push({ id: 'drawio', label: 'draw.io', status: 'connected', detail: 'Built in: Build → Diagram (draw.io). Opens the full editor and saves back into the app.', action: 'drawio' });
  }

  out.push({
    id: 'controller', label: 'Account controller', status: 'separate', action: null,
    detail: 'Runs beside the app on your laptop and signs you in to the services above (GitHub, Google, AWS) so you can connect them. It is not wired into the app, on purpose: a link a web page can call is a link other web pages can try.',
  });

  return out;
}

/** Counts for a one-line summary. `separate` is neither good nor bad. */
export function summarise(list = []) {
  const counted = list.filter((c) => c.status !== 'separate');
  return {
    connected: counted.filter((c) => c.status === 'connected').length,
    attention: counted.filter((c) => c.status === 'attention').length,
    off: counted.filter((c) => c.status === 'off').length,
    total: counted.length,
  };
}
