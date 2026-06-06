/**
 * outreach.js — Outreach & Persuasion Strategist
 *
 * Reviews the email's psychological + structural strength: hook,
 * personalization, social proof, CTA, you-vs-I ratio, follow-up.
 *
 * Based on: HubSpot outreach reports, Lavender.ai data, Predictable
 * Revenue, Cialdini's influence principles.
 */

import {
  finding, NUMBER_RESULT_REGEX, PERSONAL_HOOK_REGEX, PROOF_REGEX,
  QUESTION_REGEX, wordCount,
} from './framework.js';

export const outreachStrategist = {
  id: 'outreach',
  name: 'Devi Patel',
  role: 'Outreach & Persuasion Strategist',
  expertiseAreas: ['Cold outreach', 'Sales psychology', 'Reply-rate optimization', 'B2B copywriting'],
  yearsExperience: 15,
  systemPrompt: 'You are a senior cold outreach strategist with 15 years experience. Review the email for hook strength, personalization, single clear CTA, you/I ratio, and follow-up signals. Be specific.',

  review(ctx) {
    const findings = [];
    const { subject, body, intent, recipient, ctas, youI } = ctx;
    const words = ctx.bodyWordCount;

    // Only run outreach checks for outreach / proposal intent
    if (intent !== 'outreach' && intent !== 'proposal' && intent !== 'followup') {
      return findings;
    }

    // EMAIL-HOOK-001 — no opener hook in first 2 lines
    const opening = body.split(/\n+/).slice(0, 2).join(' ');
    const hasHook = PERSONAL_HOOK_REGEX.test(opening)
                 || QUESTION_REGEX.test(opening)
                 || /\bcongrats?\b|\bI saw\b|\bI noticed\b|\bI read\b|\bI was impressed\b/i.test(opening);
    if (!hasHook && words >= 20) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'EMAIL-HOOK-001',
        title: 'No personal hook in the opener',
        body: 'The first 1-2 lines don\'t reference the recipient specifically. Generic openers ("Hi, I hope this finds you well") have ~3% reply rates.',
        fix: 'Open with something specific: "I noticed your post about X" / "Congrats on the recent Y" / "I saw your job ad for Z" / a direct question about their work.',
      }));
    }

    // EMAIL-PERSONAL-001 — no personalization markers at all
    const hasName     = recipient?.name && body.includes(recipient.name);
    const hasCompany  = recipient?.company && body.includes(recipient.company);
    const hasYour     = /\byour (?:company|team|project|product|service|work|website|post|blog|article|story|app|platform|business|brand|launch|recent|latest)\b/i.test(body);
    if (!hasName && !hasCompany && !hasYour) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'EMAIL-PERSONAL-001',
        title: 'No personalization signals',
        body: 'The body never references the recipient\'s name, company, or anything specific to them. Reads like a mass mail merge.',
        fix: 'Reference their name, their company, or something specific you saw them do.',
      }));
    }

    // EMAIL-YOU-RATIO-001 — too self-focused (fires when I/my outweighs you/your)
    if (youI.i + youI.you >= 4 && youI.i > youI.you) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'EMAIL-YOU-RATIO-001',
        title: '"I/my" appears more often than "you/your"',
        body: `Body uses "you/your" ${youI.you}× vs "I/my/me" ${youI.i}×. Reader-facing emails should lean heavily on "you".`,
        fix: 'Rewrite self-statements as benefit statements. Instead of "I have 5 years experience with AWS" → "You\'ll get someone who has shipped on AWS for 5 years."',
      }));
    }

    // EMAIL-CTA-001 — no clear call to action
    if (ctas.length === 0) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'EMAIL-CTA-001',
        title: 'No clear call to action',
        body: 'The email doesn\'t ask for anything specific. Recipients won\'t reply if they can\'t tell what you want.',
        fix: 'End with one clear ask: "Are you free for a 15-minute call next Tuesday?" / "Want me to send a 1-pager?" / "Worth a quick chat?"',
      }));
    }

    // EMAIL-MULTI-CTA-001 — more than one CTA decreases conversion
    if (ctas.length >= 3) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'EMAIL-MULTI-CTA-001',
        title: `${ctas.length} different calls to action`,
        body: 'Multiple CTAs split the reader\'s attention. Reply rates roughly halve when CTAs go from one to three.',
        fix: 'Pick the single most important ask. Cut the others.',
      }));
    }

    // EMAIL-SOCIAL-PROOF-001 — no credibility signals
    const hasProof = PROOF_REGEX.test(body);
    if (!hasProof && (intent === 'outreach' || intent === 'proposal')) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'EMAIL-SOCIAL-PROOF-001',
        title: 'No social proof or credentials mentioned',
        body: 'The reader has no reason to trust you. Outreach without proof gets ignored.',
        fix: 'Add one specific credibility line: "AWS Certified Solutions Architect" / "Delivered X for Y client" / "5 years building on AWS".',
      }));
    }

    // EMAIL-SPECIFIC-001 — no specific numbers / results
    if (!NUMBER_RESULT_REGEX.test(body) && intent === 'proposal') {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'EMAIL-SPECIFIC-001',
        title: 'No specific numbers, dates, or results',
        body: 'Proposals win on specificity. Vague "improve performance" beats nothing but loses to "cut p95 latency from 800ms to 200ms".',
        fix: 'Add concrete numbers: timeline in weeks, % cost savings, latency targets, number of users handled.',
      }));
    }

    // EMAIL-LENGTH-OUTREACH-001 — outreach should be 50-150 words
    if (intent === 'outreach' && words >= 20) {
      if (words < 40) {
        findings.push(finding({
          severity: 'low',
          ruleId: 'EMAIL-LENGTH-SHORT-001',
          title: 'Outreach is unusually short',
          body: `${words} words. Too brief to convey value or build rapport.`,
          fix: 'Aim for 60-120 words. Add a specific compliment + one value statement + one question.',
        }));
      } else if (words > 180) {
        findings.push(finding({
          severity: 'medium',
          ruleId: 'EMAIL-LENGTH-LONG-001',
          title: 'Outreach is over the sweet spot',
          body: `${words} words. Studies show reply rates drop sharply above 150 words for cold outreach.`,
          fix: 'Cut to under 150 words. The reply is where details belong.',
        }));
      }
    }

    // EMAIL-Q-001 — no question to invite reply
    if (!QUESTION_REGEX.test(body) && (intent === 'outreach' || intent === 'followup')) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'EMAIL-Q-001',
        title: 'No question in the body',
        body: 'Emails without a question rarely get replies — the reader has nothing specific to respond to.',
        fix: 'Add one direct question, ideally the CTA itself.',
      }));
    }

    // EMAIL-SIGN-OFF-001 — missing sign-off
    const lastLines = body.split(/\n+/).slice(-3).join(' ').toLowerCase();
    const hasSignoff = /\b(thanks|cheers|best|kind regards|warm regards|sincerely|regards|take care|talk soon|speak soon|appreciate)\b/i.test(lastLines);
    if (!hasSignoff && words >= 30) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'EMAIL-SIGN-OFF-001',
        title: 'No professional sign-off',
        body: 'Emails feel incomplete without a closing like "Thanks," or "Best,".',
        fix: 'Add a 1-word sign-off followed by your name.',
      }));
    }

    // EMAIL-SUBJECT-VAGUE-001 — vague subjects
    const vagueSubjects = /^(?:hi|hello|hey|question|update|info|opportunity|quick question|just checking|following up|touching base)\.?$/i;
    if (vagueSubjects.test(subject.trim())) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'EMAIL-SUBJECT-VAGUE-001',
        title: 'Subject is generic',
        body: `"${subject}" gives the reader no reason to open. Generic subjects are the #1 cause of low open rates.`,
        fix: 'Reference something specific: their name, their company, their recent work, or a number.',
        evidence: subject,
      }));
    }

    // EMAIL-FIRST-NAME-001 — recipient name not used at all in greeting
    if (recipient?.name && words >= 15 && !body.toLowerCase().includes(String(recipient.name).toLowerCase())) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'EMAIL-FIRST-NAME-001',
        title: 'Recipient name not used in body',
        body: 'You have their first name but never used it. Personalization tokens left empty look broken.',
        fix: `Open with "Hi ${recipient.name}," or work it in naturally.`,
      }));
    }

    return findings;
  },
};
