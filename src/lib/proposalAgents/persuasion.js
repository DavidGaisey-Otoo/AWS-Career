/**
 * persuasion.js — Persuasion Architect
 *
 * Reviews the proposal's hook strength, structure, social proof,
 * specificity, and story arc. Based on 20 years of B2B proposal
 * patterns + Cialdini's influence principles.
 */

import {
  finding, POWER_WORDS, SECTION_HEADERS, wordCount,
} from './framework.js';

export const persuasionArchitect = {
  id: 'persuasion',
  name: 'Camila Vargas',
  role: 'Persuasion Architect',
  expertiseAreas: ['Hook design', 'Story arc', 'Social proof', 'Specificity'],
  yearsExperience: 22,
  systemPrompt: 'You are a senior B2B proposal writer with 22 years of experience. Review the proposal for hook strength, persuasive structure, social proof, and specificity. Be brutally honest.',

  review(ctx) {
    const findings = [];
    const { proposalText, proposalLower, wordCount: words, clientName, jobBrief, powerWords } = ctx;

    // PROP-HOOK-001 — opener is a generic "Hi, I'm interested"
    const opener = proposalText.split(/\n+/).slice(0, 2).join(' ').toLowerCase();
    const genericOpeners = [
      'i am writing', 'i am interested', 'i would like to', 'i hope this',
      'i came across', 'dear hiring manager', 'to whom it may concern',
      'i would love to', 'i wanted to apply', 'i am applying',
    ];
    if (genericOpeners.some((g) => opener.includes(g)) && words >= 50) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PROP-HOOK-001',
        title: 'Opener is generic',
        body: 'The first 1-2 sentences sound like 90% of other proposals. Generic openers get skimmed past.',
        fix: 'Open with a specific observation about THEIR project: "Your job mentions 50K concurrent users by Q3 — that\'s the part most proposals miss." or "I noticed you ruled out NoSQL — smart, here\'s why I agree."',
      }));
    }

    // PROP-CLIENT-NAME-001 — client name never mentioned
    if (clientName && !proposalText.toLowerCase().includes(clientName.toLowerCase()) && words >= 50) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PROP-CLIENT-NAME-001',
        title: 'Client name not used in proposal',
        body: `You have the client name "${clientName}" but never use it. Reads like a copy-paste template.`,
        fix: `Address them by name at least once: "Hi ${clientName},..."`,
      }));
    }

    // PROP-MIRROR-001 — proposal doesn't echo specific terms from the job brief
    if (jobBrief && jobBrief.length > 50) {
      // Find significant words from the brief (5+ chars, not stop words)
      const stopWords = new Set(['about', 'where', 'which', 'their', 'would', 'could', 'should', 'after', 'before', 'these', 'those', 'while', 'project', 'looking', 'someone', 'please']);
      const briefWords = (jobBrief.toLowerCase().match(/\b[a-z]{6,}\b/g) || [])
        .filter((w) => !stopWords.has(w));
      const briefWordSet = new Set(briefWords);
      const propWords = new Set((proposalLower.match(/\b[a-z]{6,}\b/g) || []));
      const overlap = [...briefWordSet].filter((w) => propWords.has(w)).length;
      const overlapRate = briefWordSet.size > 0 ? overlap / briefWordSet.size : 0;
      if (overlapRate < 0.15 && briefWordSet.size >= 10) {
        findings.push(finding({
          severity: 'high',
          ruleId: 'PROP-MIRROR-001',
          title: 'Proposal doesn\'t mirror the client\'s language',
          body: `Your proposal shares only ${Math.round(overlapRate * 100)}% of significant vocabulary with the job brief. Clients trust proposals that echo their own words.`,
          fix: 'Reread the brief. Pull 3-5 specific phrases ("multi-region failover", "GDPR-compliant audit trail", "5K concurrent users") and use them verbatim.',
        }));
      }
    }

    // PROP-SOCIAL-PROOF-001 — no credibility signals (specific proof, not vague claims)
    const proofRegex = /\b(certified|aws certified|case study|portfolio|published|featured|trusted by|delivered|launched|managed|architected|shipped|\d+\+?\s*years? (?:of )?(?:hands[- ]on|production|aws|cloud))\b/i;
    if (!proofRegex.test(proposalText) && words >= 70) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PROP-SOCIAL-PROOF-001',
        title: 'No social proof or credentials',
        body: 'Reader has no reason to trust you over the next applicant.',
        fix: 'Add one specific credibility line: "AWS Certified Solutions Architect — Associate" / "Cut a SaaS client\'s monthly bill from $14k to $8k last quarter" / "5 years on production AWS workloads".',
      }));
    }

    // PROP-NUMBERS-001 — no concrete numbers anywhere
    const numberRegex = /\b\d+\s*(?:%|percent|x|hours?|days?|weeks?|months?|years?|clients?|users?|customers?|projects?|leads?|deals?|cases?|requests?|tps|qps|gb|tb|ms|s|minutes?)\b/i;
    if (!numberRegex.test(proposalText) && words >= 50) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PROP-NUMBERS-001',
        title: 'No specific numbers',
        body: 'Proposals win on specificity. Vague claims ("improve performance") lose to concrete claims ("cut p95 latency from 800ms to 200ms").',
        fix: 'Add at least 3 concrete numbers: timeline in weeks, % cost savings, latency targets, user count, throughput.',
      }));
    }

    // PROP-STRUCTURE-001 — body lacks clear sections
    if (words >= 150) {
      const sectionsPresent = Object.entries(SECTION_HEADERS).filter(([, rx]) => rx.test(proposalText));
      if (sectionsPresent.length < 4) {
        findings.push(finding({
          severity: 'medium',
          ruleId: 'PROP-STRUCTURE-001',
          title: 'Proposal lacks clear structure',
          body: `Only ${sectionsPresent.length} of 7 standard sections detected (hook, understanding, approach, why-me, timeline, pricing, CTA). Clients scan for these — missing ones look amateur.`,
          fix: 'Add clear section headings or bold phrases for: Understanding, Approach, Why me, Timeline, Investment, Next steps.',
        }));
      }
    }

    // PROP-CTA-001 — no clear next step
    const ctaRegex = /\b(are you (?:free|available|open)|book a (?:call|chat|discovery)|reply (?:back )?(?:with|if)|schedule a|let'?s (?:talk|chat|set up)|happy to (?:share|send|book|jump on)|worth a (?:quick )?(?:chat|call|conversation)|next steps?:|click (?:the link|here|below|to book))\b/i;
    if (!ctaRegex.test(proposalText) && words >= 60) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PROP-CTA-001',
        title: 'No clear call to action',
        body: 'The proposal doesn\'t tell the client what to do next. Clients won\'t hire you if they can\'t tell how to take the next step.',
        fix: 'End with one specific ask: "If this resonates, I have Tuesday 2-3pm or Thursday 10-11am UK time open for a 15-minute discovery call — which suits?"',
      }));
    }

    // PROP-LENGTH-001 — too short or too long
    if (words > 0 && words < 80) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PROP-LENGTH-SHORT-001',
        title: 'Proposal is unusually short',
        body: `${words} words. Too brief to demonstrate understanding or build trust on anything beyond a tiny gig.`,
        fix: 'Aim for 200-400 words for most freelance proposals. Trim padding, keep substance.',
      }));
    } else if (words > 600) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PROP-LENGTH-LONG-001',
        title: 'Proposal is long',
        body: `${words} words. Most clients skim — anything over 500 words risks them quitting before the CTA.`,
        fix: 'Cut to 250-400 words. Move details into an attachment or a follow-up email.',
      }));
    }

    // PROP-POWER-WORDS-001 — positive signal (info finding)
    if (powerWords.length >= 4) {
      findings.push(finding({
        severity: 'info',
        ruleId: 'PROP-POWER-WORDS-OK-001',
        title: 'Strong outcome-focused language',
        body: `Found ${powerWords.length} power words (${powerWords.slice(0, 4).join(', ')}). This signals concrete delivery.`,
      }));
    }

    return findings;
  },
};
