/**
 * Pass B: delivery runbooks, client safety, account security.
 *
 * Pinned, beyond the happy path:
 *   - the account check fails closed: no account found, no client account
 *     recorded, or David's own account → not ok;
 *   - steps that change the client's account stay locked until it passes;
 *   - every change has an undo, and the handover lists it;
 *   - a cost check changes nothing;
 *   - the access request never asks for the root password or for a
 *     password in chat;
 *   - a security tick is dated, and an old one asks to be checked again.
 * Account numbers are AWS's documented examples (repoSecrets enforces it).
 */
import {
  RUNBOOKS, accessRequestMessage, checkAccountTarget, handoverReport, newDelivery,
  notesProblem, progress, stepLocked, toggleStep,
} from '../deliveryRunbooks.js';
import { securityStatus, toggleSecurity } from '../accountSecurity.js';
import { buildFacts } from '../myFacts.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const CLIENT = '111122223333';
const MINE = '444455556666';
const STS = (id) => `{\n  "UserId": "AIDAEXAMPLE",\n  "Account": "${id}",\n  "Arn": "arn:aws:iam::${id}:user/david-contractor"\n}`;

export function runDeliveryWorkflowTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test('every step that changes something says how to undo it', () => {
    for (const rb of RUNBOOKS) {
      for (const s of rb.steps) {
        assert(s.undo && s.undo.length > 10, `${rb.id}/${s.id} has no undo`);
        assert(s.verify && s.minutes > 0, `${rb.id}/${s.id} has no check or time`);
      }
      assert(/estimated/i.test(rb.cost), `${rb.id} cost is not labelled an estimate`);
    }
  });

  test('a cost check changes nothing', () => {
    const rb = RUNBOOKS.find((r) => r.id === 'cost-check');
    assert(rb.steps.every((s) => s.changes === false), 'a cost-check step changes something');
    assert(rb.policies.every((p) => !/FullAccess/i.test(p)), 'cost check asks for write access');
  });

  test('the account check passes only in the client\'s account', () => {
    const ok = checkAccountTarget({ pasted: STS(CLIENT), clientAccountId: CLIENT, ownAccountIds: [MINE] });
    assert(ok.ok && ok.accountId === CLIENT, JSON.stringify(ok));
  });

  test('your own account is refused, even if it was entered as the client\'s', () => {
    const r = checkAccountTarget({ pasted: STS(MINE), clientAccountId: MINE, ownAccountIds: [MINE] });
    assert(!r.ok && r.problems.some((p) => /YOUR account/.test(p)), JSON.stringify(r));
  });

  test('the account check fails closed', () => {
    assert(!checkAccountTarget({ pasted: 'nothing useful', clientAccountId: CLIENT }).ok, 'no account found read as ok');
    assert(!checkAccountTarget({ pasted: STS(CLIENT), clientAccountId: '' }).ok, 'no client account read as ok');
    const wrong = checkAccountTarget({ pasted: STS('555555555555'), clientAccountId: CLIENT });
    assert(!wrong.ok && wrong.problems.some((p) => /Switch accounts/.test(p)), JSON.stringify(wrong));
    assert(checkAccountTarget({ pasted: 'Account ID 1111-2222-3333', clientAccountId: CLIENT }).accountId === CLIENT, 'console format not read');
  });

  test('changing steps stay locked until the account check passes', () => {
    const d = newDelivery({ runbookId: 'static-site', client: 'Lumen Bakery', clientAccountId: CLIENT });
    assert(stepLocked(d, 'bucket'), 'bucket step unlocked before the check');
    assert(!stepLocked(d, 'test'), 'a read-only step should not be locked');
    assert(!stepLocked({ ...d, accountChecked: '2026-11-26' }, 'bucket'), 'still locked after the check');
  });

  test('ticking a step records the change with its undo; unticking removes it', () => {
    let d = { ...newDelivery({ runbookId: 'safe-start', client: 'Lumen Bakery', clientAccountId: CLIENT }), accountChecked: 'x' };
    d = toggleStep(d, 'budget', new Date('2026-11-26T10:00:00Z'));
    assert(d.changes.length === 1 && /delete the budget/.test(d.changes[0].undo), JSON.stringify(d.changes));
    assert(progress(d).done === 1, 'progress not counted');
    d = toggleStep(d, 'budget');
    assert(d.changes.length === 0 && !d.done.budget, 'untick left the change behind');
  });

  test('the handover lists each change with its undo, the cost estimate and removing access', () => {
    let d = { ...newDelivery({ runbookId: 'static-site', client: 'Lumen Bakery', clientAccountId: CLIENT }), accountChecked: 'x' };
    d = toggleStep(d, 'bucket');
    d = toggleStep(d, 'dns');
    const report = handoverReport(d, { author: 'David' });
    assert(/To undo: Empty the bucket/.test(report) && /To undo: Put back the old DNS records/.test(report), report);
    assert(/RUNNING COST\nEstimated/.test(report) && /Delete the IAM user you created for me/.test(report), 'cost or access removal missing');
    assert(/ending 3333/.test(report) && !report.includes(CLIENT), 'full account number in the report');
  });

  test('a cost-check handover says nothing was changed', () => {
    let d = newDelivery({ runbookId: 'cost-check', client: 'X' });
    d = toggleStep(d, 'idle');
    assert(/nothing in your account was changed or deleted/.test(handoverReport(d)), handoverReport(d));
  });

  test('the access request asks for least privilege and keeps passwords out of chat', () => {
    const m = accessRequestMessage({ runbookId: 'static-site', clientName: 'Ama Mensah', myName: 'David' });
    assert(/Hi Ama,/.test(m) && /david-contractor/.test(m), m);
    assert(/Attach only these permissions: AmazonS3FullAccess/.test(m), 'permissions missing');
    assert(/don't send me your root password/i.test(m) && /don't type the temporary password in this chat/i.test(m), 'password safety missing');
    assert(!/AdministratorAccess/.test(m), 'asked for admin');
    assert(!/@|whatsapp|telegram/i.test(m), 'off-platform contact in an Upwork message');
  });

  test('notes holding a password or key are refused; ordinary notes are not', () => {
    assert(notesProblem('temp password: Summer2026!'), 'password accepted');
    assert(notesProblem('key AKIAIOSFODNN7EXAMPLE'), 'access key accepted');
    assert(notesProblem('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'), 'secret key accepted');
    assert(!notesProblem('Client prefers calls after 5pm GMT. Domain at Namecheap.'), 'ordinary notes refused');
  });

  test('your own account IDs are kept only when they are 12 digits', () => {
    const f = buildFacts({ ownAccountIds: [MINE, '1234', '4444-5555-6666'] });
    assert(f.ownAccountIds.length === 2 && f.ownAccountIds.every((x) => x === MINE), JSON.stringify(f.ownAccountIds));
  });

  test('a security tick is dated; an old one asks to be checked again; payout waits', () => {
    const now = new Date(2026, 10, 26);
    let s = toggleSecurity({}, 'upwork-2sv', now);
    assert(s['upwork-2sv'].checkedOn === '2026-11-26', JSON.stringify(s));
    const st = securityStatus(s, now);
    assert(st.items.find((i) => i.id === 'upwork-2sv').status === 'done' && st.done === 1, JSON.stringify(st.items[0]));
    assert(st.items.find((i) => i.id === 'payout-2fa').status === 'later', 'payout should wait for the first payment');
    const old = securityStatus({ 'gmail-2sv': { done: true, checkedOn: '2026-01-01' } }, now);
    assert(old.items.find((i) => i.id === 'gmail-2sv').status === 'recheck' && old.stale === 1, 'old tick not flagged');
    s = toggleSecurity(s, 'upwork-2sv', now);
    assert(!s['upwork-2sv'], 'untick failed');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
