/**
 * truthCheck.js — does this text claim anything David's facts do not hold?
 *
 * The CareerCraft truth_guard idea: every credential, number and skill in
 * a proposal must already be in the facts (myFacts.js). Anything new is
 * flagged. A confident false claim on Upwork costs the account, not just
 * the job, so the claims that can be checked against facts BLOCK the copy
 * button; the ones that can only be checked against evidence ask for a
 * second look.
 *
 *   blockers — false by the facts: a certificate he does not hold, more
 *              years than he has, client work he has not done, a skill
 *              listed as a gap, "senior"/"expert", a guarantee.
 *   verify   — could be true, but nothing in the facts proves it.
 *
 * Saying you are STUDYING for a certificate is honest and passes.
 * Pure: no storage, no network.
 */
import { KNOWN_CERTIFICATES, holdsCert } from './myFacts.js';
import { SKILLS } from './myProfile.js';
import { findUnsupportedClaims, CLAIM_LABELS } from './claimSafety.js';

const STUDYING = /\b(?:studying|preparing|revising|working\s+(?:towards?|on)|currently\s+learning|next\s+(?:exam|certification)|planning\s+to\s+(?:take|sit)|aim(?:ing)?\s+to\s+(?:take|pass|sit)|booked)\b/i;
const FIRST_PERSON = /\b(?:I|I'm|I've|I'd|my|me|we|we've|our)\b/;
const CLOUD_WORDS = /\b(?:aws|amazon|cloud|devops|ec2|s3|lambda|kubernetes|eks|terraform|cloudformation|azure|gcp|serverless)\b/i;
const EXPERIENCE_WORDS = /\b(?:experience|experienced|in\s+(?:it|the\s+industry|tech)|working|worked|career|background|hands-on|professional(?:ly)?|as\s+an?\b)/i;

/** Split into sentences, keeping list lines on their own. */
export function sentencesOf(text) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9•\-*"'(])/)
    .map((s) => s.replace(/^\s*(?:[•*\-–]|\d+\.)\s*/, '').trim())
    .filter(Boolean);
}

const quote = (s) => (s.length > 140 ? `${s.slice(0, 137)}…` : s);

/**
 * @param {string} text
 * @param {object} facts — from buildFacts()
 * @param {{ now?: Date }} options
 * @returns {{ ok:boolean, blockers:Finding[], verify:Finding[] }}
 *   Finding = { id, quote, why, fix }
 */
export function checkTruth(text, facts, { now = new Date() } = {}) {
  const blockers = [];
  const verify = [];
  if (!facts) {
    // No facts means nothing can be checked — that is not a pass.
    return { ok: false, blockers: [{ id: 'no-facts', quote: '', why: 'Your facts could not be read, so nothing in this text can be checked.', fix: 'Open My facts and check it loads.' }], verify };
  }
  const seen = new Set();
  const add = (list, f) => {
    const key = `${f.id}|${f.quote}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push(f);
  };
  const today = now.toISOString().slice(0, 7);

  for (const sentence of sentencesOf(text)) {
    const s = sentence;
    const studying = STUDYING.test(s);

    // ── Certificates ────────────────────────────────────────────────
    const named = KNOWN_CERTIFICATES.filter((c) => c.re.test(s));
    // "Solutions Architect – Professional" also matches the Associate
    // pattern; report the more specific one only.
    const specific = named.filter((c) => !(c.id === 'aws-saa' && named.some((o) => o.id === 'aws-sap')));
    for (const cert of specific) {
      if (holdsCert(facts, cert.id)) {
        const held = facts.certificates.find((c) => c.id === cert.id);
        if (held?.expires && held.expires < today) {
          add(blockers, { id: `expired:${cert.id}`, quote: quote(s), why: `${cert.name} expired in ${held.expires}.`, fix: 'Say it has lapsed, or renew it before claiming it.' });
        }
        continue;
      }
      if (studying) continue;
      const isStudying = facts.studying.some((st) => st.id === cert.id);
      add(blockers, {
        id: `cert:${cert.id}`,
        quote: quote(s),
        why: `Mentions ${cert.name}, which is not in your facts.`,
        fix: isStudying ? `Say you are studying for it ("I'm currently studying for ${cert.name}").` : 'Remove it. Add it to My facts, with the date, once you have earned it.',
      });
    }
    if (/\baws[- ]certified\b/i.test(s) && !named.length && !facts.certificates.some((c) => c.id.startsWith('aws-'))) {
      add(blockers, { id: 'cert:aws-any', quote: quote(s), why: 'Claims to be AWS certified, and your facts hold no AWS certificate.', fix: 'Remove it.' });
    }

    if (!FIRST_PERSON.test(s)) continue;

    // ── Years of experience ─────────────────────────────────────────
    for (const m of s.matchAll(/\b(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/gi)) {
      if (!EXPERIENCE_WORDS.test(s)) continue;
      const n = Number(m[1]);
      const cloud = CLOUD_WORDS.test(s) && !/\b(?:in|of)\s+(?:it|networking|network\s+admin\w*)\b/i.test(s);
      const limit = cloud ? facts.cloudYears : facts.yearsInIT;
      if (n > limit) {
        add(blockers, {
          id: cloud ? 'years:cloud' : 'years:it',
          quote: quote(s),
          why: cloud
            ? `Claims ${n} years of cloud/AWS work; your facts have ${limit}.`
            : `Claims ${n} years; your facts have ${limit} years in IT.`,
          fix: cloud ? `Say "${facts.yearsInIT}+ years in IT and networking" instead. That is true.` : `Use ${limit}, the number in your facts.`,
        });
      }
    }

    // ── Client work and outcomes ────────────────────────────────────
    const count = s.match(/\b(\d{1,4})\s*\+?\s*(?:happy\s+|satisfied\s+)?(clients?|customers?|businesses|companies|projects?|deployments?|migrations?|jobs?|websites?|accounts?)\b/i);
    if (count && /\b(?:delivered|completed|finished|helped|worked\s+(?:with|for)|served|built|deployed|migrated|secured|set\s+up|done|for)\b/i.test(s)) {
      const n = Number(count[1]);
      const lab = /\b(?:lab|training|practice|own\s+(?:aws\s+)?account|portfolio|personal)\b/i.test(s);
      const limit = lab ? facts.portfolio.length : facts.clientJobsCompleted;
      if (n > limit) {
        add(blockers, {
          id: 'count',
          quote: quote(s),
          why: lab ? `Claims ${n} ${count[2]}; your portfolio has ${limit}.` : `Claims ${n} ${count[2]} done for others; your facts record ${limit} paid client jobs.`,
          fix: facts.clientJobsCompleted ? `Use ${limit}.` : 'Point to your portfolio projects instead, and say they were built in your own training account.',
        });
      }
    }
    if (/\b\d{1,3}\s*%/.test(s) && /\b(?:cut|saved|reduced|lowered|improved|increased|boosted|faster|cheaper)\b/i.test(s) && !/\b(?:can|could|may|might|aim|typically|usually|estimate)\b/i.test(s)) {
      add(facts.clientJobsCompleted ? verify : blockers, {
        id: 'outcome-number',
        quote: quote(s),
        why: 'States a measured result (a percentage) that is not in your facts.',
        fix: 'Remove the number, or say what you would check ("I will measure the cost before and after").',
      });
    }

    // ── Seniority ───────────────────────────────────────────────────
    if (facts.level === 'entry' && /\bI(?:'m|\s+am)\s+(?:an?\s+)?(?:senior|lead|principal|seasoned|veteran|expert|guru|top[- ]rated)\b|\b(?:as\s+an?|I'm\s+an?)\s+(?:aws|cloud)\s+(?:expert|architect|guru)\b/i.test(s)) {
      add(blockers, { id: 'seniority', quote: quote(s), why: 'Describes you as senior or expert; your facts say entry level.', fix: 'Describe what you do instead ("I set up AWS accounts safely and cheaply").' });
    }

    // ── Skills listed as gaps ───────────────────────────────────────
    const claim = s.match(/\b(?:I\s+have|I've\s+got|I\s+bring|with)\s+(?:\w+\s+){0,3}?(?:experience|expertise|background)\s+(?:with|in|on|using)\s+([^.;]+)|\bI(?:'m|\s+am)\s+(?:an?\s+)?(?:experienced|proficient|skilled|fluent|strong)\s+(?:in|with|at)\s+([^.;]+)|\bI(?:'ve|\s+have)\s+(?:built|managed|run|deployed|automated|maintained|developed|written)\s+([^.;]+)/i);
    if (claim) {
      const span = (claim[1] || claim[2] || claim[3] || '').split(/\b(?:but|though|and\s+I(?:'ll|\s+will|'m|\s+am)\s+(?:learn|study)|while)\b/i)[0];
      for (const skill of SKILLS) {
        if (!skill.learn || facts.skills.has(skill.id)) continue;
        if (skill.re.test(span)) {
          add(blockers, { id: `skill:${skill.id}`, quote: quote(s), why: `Claims experience with ${skill.label}, which your facts list as something still to learn.`, fix: `Remove it, or say plainly that you would be learning it on this job.` });
        }
      }
    }
  }

  // ── Wording the older claim check catches ─────────────────────────
  for (const id of findUnsupportedClaims(text)) {
    if (id === 'certification' || id === 'years-experience') continue; // checked against facts above
    const label = CLAIM_LABELS[id] || id;
    if (id === 'guarantee') {
      add(blockers, { id: 'guarantee', quote: '', why: `It ${label}. Nobody can guarantee an AWS result or bill.`, fix: 'Say "estimated" and state the conditions.' });
    } else if (id === 'production-history' && !facts.clientJobsCompleted) {
      add(blockers, { id: 'production-history', quote: '', why: `It ${label}; your facts record no paid client jobs yet.`, fix: 'Point to your portfolio projects, built in your own training account.' });
    } else {
      add(verify, { id, quote: '', why: `It ${label}.`, fix: 'Keep it only if you can show the evidence.' });
    }
  }

  return { ok: blockers.length === 0, blockers, verify };
}

/** One line for a button tooltip or toast. */
export function truthSummary(result) {
  if (!result) return 'Not checked.';
  if (result.blockers.length) return `${result.blockers.length} claim${result.blockers.length === 1 ? '' : 's'} your facts do not support. Fix before copying.`;
  if (result.verify.length) return `No false claims found; ${result.verify.length} to double-check.`;
  return 'Every claim checked against your facts.';
}
