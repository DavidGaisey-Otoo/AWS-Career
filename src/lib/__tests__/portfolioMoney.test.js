/**
 * Pass C: portfolio redaction and the Upwork money tracker.
 *
 * Pinned, beyond the happy path:
 *   - every form of account number is removed, including a shortened one
 *     and one with dashes; ARNs, emails, keys and the display name too;
 *   - limits are enforced and the user is told when something is cut;
 *   - a portfolio description is truth-checked like a proposal;
 *   - Connects with no recorded price are an estimate, never "paid";
 *   - win rate with no answers yet is unknown, not 0%.
 * Account numbers are AWS's documented examples (repoSecrets enforces it).
 */
import { caseStudy, normalizeRect, redactText, toNaturalRects, upworkItem } from '../portfolioRedaction.js';
import { ledgerEntry, ledgerSummary, setOutcome, upworkNet } from '../upworkMoney.js';
import { buildFacts } from '../myFacts.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runPortfolioMoneyTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test('account numbers in every form are removed', () => {
    const r = redactText('Account 111122223333, also 1111-2222-3333, header shows 111122… and 4444-55...');
    assert(!/1111|4444/.test(r.text), r.text);
    assert(r.hits.some((h) => h.type === 'account ID (shortened)' && h.count === 2), JSON.stringify(r.hits));
  });

  test('ARNs, emails, keys and the display name are removed', () => {
    const r = redactText('Role arn:aws:iam::123456789012:role/lab by someone@example.com key AKIAIOSFODNN7EXAMPLE in Training Lab', { displayNames: ['Training Lab'] });
    assert(!/arn:aws:iam::|@example|AKIA|Training Lab/.test(r.text), r.text);
    assert(r.hits.length >= 4, JSON.stringify(r.hits));
  });

  test('ordinary numbers survive: CIDR, money, dates, ports', () => {
    const t = 'VPC 10.0.0.0/16 with a $5 budget, built Sept 2026 on port 443 using t3.micro.';
    assert(redactText(t).text === t, redactText(t).text);
  });

  test('image boxes map to real pixels, whichever way they were drawn', () => {
    const r = normalizeRect({ x: 50, y: 40 }, { x: 10, y: 20 });
    assert(r.x === 10 && r.y === 20 && r.w === 40 && r.h === 20, JSON.stringify(r));
    const [n] = toNaturalRects([r], 500, 1000, 0);
    assert(n.x === 20 && n.w === 80 && n.h === 40, JSON.stringify(n));
    assert(toNaturalRects([{ x: 1, y: 1, w: 1, h: 1 }], 500, 1000).length === 0, 'a stray click became a box');
  });

  test('the case study is redacted and keeps the README shape', () => {
    const s = caseStudy({ title: 'VPC', problem: 'Flat network', did: ['Built 6 subnets in account 111122223333'], evidence: ['resource map'], clientGets: 'isolation' });
    assert(/\*\*Problem:\*\*/.test(s) && /\*\*What I did\*\*/.test(s) && /\[account ID\]/.test(s) && !/111122223333/.test(s), s);
    assert(/own training account/.test(s), 'where it was built is missing');
  });

  test('the Upwork item enforces 600 characters and 5 skills, and says so', () => {
    const item = upworkItem({ title: 'Secure AWS Account Setup', description: 'word '.repeat(200), skills: ['a', 'b', 'c', 'd', 'e', 'f', 'a'] });
    assert(item.description.length <= 600 && item.skills.length === 5, `${item.description.length} ${item.skills.length}`);
    assert(item.problems.some((p) => /600/.test(p)) && item.problems.some((p) => /5 skills/.test(p)), JSON.stringify(item.problems));
  });

  test('a portfolio description is truth-checked', () => {
    const facts = buildFacts();
    const bad = upworkItem({ title: 'X', description: 'As a certified Solutions Architect I built this for 20 clients.' }, { facts });
    assert(!bad.ok && bad.truth.blockers.length >= 1, JSON.stringify(bad.truth));
    const good = upworkItem({ title: 'Three-Tier VPC', description: 'Designed a VPC with public, app and database subnets in two AZs, in my own training account.' }, { facts });
    assert(good.ok, JSON.stringify(good));
  });

  test('Upwork fee and net are worked out from the fee setting', () => {
    const n = upworkNet(150, { feeRate: 0.1 });
    assert(n.fee === 15 && n.net === 135, JSON.stringify(n));
  });

  test('the ledger: balance, cost per win, and estimates labelled', () => {
    let l = [
      ledgerEntry({ kind: 'buy', connects: 80, dollars: 12, date: '2026-11-20' }),
      ledgerEntry({ kind: 'buy', connects: 10, date: '2026-11-21' }),
      ledgerEntry({ kind: 'other', connects: 35, job: 'ID verification' }),
    ];
    const s0 = ledgerSummary(l, { pricePerConnect: 0.15, feeRate: 0.1 });
    assert(s0.balance === 55 && s0.paid === 13.5 && s0.paidIsEstimate, JSON.stringify(s0));
    assert(s0.proposals === 0 && s0.connectsOther === 35, 'ID verification counted as a proposal');
    assert(s0.winRate === null && s0.costPerWin === null, 'win rate with no answers should be unknown');
    const spend = ledgerEntry({ kind: 'spend', connects: 8, job: 'S3 site' });
    l = [...l, spend];
    l = setOutcome(l, spend.id, 'won', 150);
    const s1 = ledgerSummary(l, { pricePerConnect: 0.15, feeRate: 0.1 });
    assert(s1.won === 1 && s1.wonNet === 135 && s1.winRate === 1 && s1.costPerWin === 1.2 && s1.balance === 47, JSON.stringify(s1));
  });

  test('a ledger line with no Connects or an unknown kind is refused', () => {
    assert(ledgerEntry({ kind: 'spend', connects: 0 }) === null, 'zero Connects accepted');
    assert(ledgerEntry({ kind: 'gift', connects: 5 }) === null, 'unknown kind accepted');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
