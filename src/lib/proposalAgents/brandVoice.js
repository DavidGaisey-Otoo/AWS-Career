/**
 * brandVoice.js — Brand Voice Coach
 *
 * Reviews tone consistency, jargon, grammar red flags, sentence length,
 * professionalism, you/I ratio, overall feel.
 */

import {
  finding, HEAVY_JARGON, WEAK_WORDS, avgSentenceLength,
} from './framework.js';

export const brandVoiceCoach = {
  id: 'brandVoice',
  name: 'Jules Aoki',
  role: 'Brand Voice Coach',
  expertiseAreas: ['Tone', 'Sentence rhythm', 'Jargon control', 'Professional polish'],
  yearsExperience: 16,
  systemPrompt: 'You are a senior copy editor with 16 years experience polishing B2B tech proposals. Flag jargon, weak words, sentence-length issues, tone inconsistencies, and grammar red flags.',

  review(ctx) {
    const findings = [];
    const { proposalText, weakWords, jargon, youI, avgSentenceLength: avgLen, wordCount: words } = ctx;

    // VOICE-WEAK-001 — too many filler words
    if (weakWords.length >= 2) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'VOICE-WEAK-001',
        title: `${weakWords.length} filler / hedging words`,
        body: `Words like "${weakWords.slice(0, 4).join('", "')}" weaken your message. Each one signals doubt.`,
        fix: 'Cut every filler. "I might be able to help" → "I\'ll help." "Hopefully we can ship by..." → "We\'ll ship by..."',
        evidence: weakWords.slice(0, 6).join(' · '),
      }));
    }

    // VOICE-JARGON-001 — too much consultancy jargon
    if (jargon.length >= 3) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'VOICE-JARGON-001',
        title: `${jargon.length} jargon terms detected`,
        body: `Terms like "${jargon.slice(0, 3).join('", "')}" make non-technical clients zone out. They also signal "trying to sound smart".`,
        fix: 'Replace each jargon term with a plain English equivalent. "Leverage" → "use". "Synergy" → cut entirely. "Best-of-breed" → "the best option".',
        evidence: jargon.join(' · '),
      }));
    }

    // VOICE-SENTENCE-LONG-001 — average sentence > 25 words = hard to read
    if (avgLen > 25 && words >= 100) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'VOICE-SENTENCE-LONG-001',
        title: 'Sentences are too long on average',
        body: `Average sentence length is ${avgLen.toFixed(1)} words. The proposal sweet spot is 12-18 words per sentence — easy to scan on mobile.`,
        fix: 'Split long sentences at every "and" or "but". Read aloud — if you run out of breath, split it.',
      }));
    } else if (avgLen < 8 && words >= 100) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'VOICE-SENTENCE-SHORT-001',
        title: 'Sentences are choppy',
        body: `Average sentence length is ${avgLen.toFixed(1)} words. Reads staccato and abrupt.`,
        fix: 'Combine related short sentences with a comma or semicolon.',
      }));
    }

    // VOICE-YOU-RATIO-001 — too self-focused
    if (youI.you + youI.i >= 8 && youI.i > youI.you * 1.3) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'VOICE-YOU-RATIO-001',
        title: '"I/my" outweighs "you/your"',
        body: `Proposal uses "I/my" ${youI.i}× vs "you/your" ${youI.you}×. Client-facing copy should heavily favour "you".`,
        fix: 'Flip self-statements: "I have 5 years of AWS experience" → "You\'ll get someone with 5 years on production AWS."',
      }));
    }

    // VOICE-CAPS-001 — random ALL CAPS words
    const capsRuns = (proposalText.match(/\b[A-Z]{4,}\b/g) || [])
      .filter((w) => !['AWS', 'GDPR', 'HIPAA', 'PCI', 'DSS', 'CRM', 'API', 'SDK', 'CDN', 'JSON', 'YAML', 'HTML', 'CSS', 'SaaS', 'IAM', 'VPC', 'ECS', 'EKS', 'RDS', 'EBS', 'EFS', 'SQS', 'SNS', 'KMS', 'NAT', 'ALB', 'NLB', 'CTO', 'CEO', 'CFO', 'COO', 'B2B', 'B2C', 'UK', 'US', 'EU', 'TLS', 'SSL', 'HTTPS', 'HTTP', 'DNS', 'WAF', 'TPS', 'QPS', 'CI', 'CD', 'CMS', 'CMK', 'OIDC', 'OAUTH', 'SSO', 'MFA', 'ROI', 'KPI', 'SLA', 'SLO', 'PDF', 'PNG', 'SVG', 'CSV'].includes(w));
    if (capsRuns.length >= 2) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'VOICE-CAPS-001',
        title: 'Random ALL CAPS for emphasis',
        body: `Words like "${capsRuns.slice(0, 2).join('", "')}" are in all caps. ALL CAPS reads as shouting in professional copy.`,
        fix: 'Use bold or italics for emphasis, not caps. Reserve caps for acronyms.',
        evidence: capsRuns.slice(0, 4).join(' · '),
      }));
    }

    // VOICE-EXCLAIM-001 — too many exclamation marks
    const exclaims = (proposalText.match(/!/g) || []).length;
    if (exclaims >= 3) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'VOICE-EXCLAIM-001',
        title: `${exclaims} exclamation marks in proposal`,
        body: 'Multiple exclamation marks read as desperate or amateur.',
        fix: 'Cut to 0-1 exclamation marks total. Let the words do the work.',
      }));
    }

    // VOICE-PASSIVE-001 — overly passive voice
    // Simple heuristic: count "was/were/been/being/is/are/be + past participle"
    const passiveMatches = proposalText.match(/\b(?:was|were|been|being|is|are|be)\s+\w+ed\b/gi) || [];
    if (passiveMatches.length >= 4 && words >= 100) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'VOICE-PASSIVE-001',
        title: 'Heavy use of passive voice',
        body: `Found ~${passiveMatches.length} passive constructions. Passive voice ("the system was deployed by the team") feels distant and slow.`,
        fix: 'Rewrite in active voice: "I deployed the system" / "We shipped..." / "You\'ll launch..."',
      }));
    }

    // VOICE-DOUBLE-SPACE-001 — sloppy formatting
    if (/  /.test(proposalText)) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'VOICE-DOUBLE-SPACE-001',
        title: 'Double spaces in text',
        body: 'Double spaces between words look unprofessional and copy-pasted.',
        fix: 'Find/replace double spaces with single spaces.',
      }));
    }

    // VOICE-TYPO-COMMON-001 — common typos
    const commonTypos = [
      { wrong: /\bteh\b/i,        right: 'the' },
      { wrong: /\brecieve\b/i,    right: 'receive' },
      { wrong: /\bseperat/i,      right: 'separat' },
      { wrong: /\boccured\b/i,    right: 'occurred' },
      { wrong: /\bdefinately\b/i, right: 'definitely' },
      { wrong: /\bbeleive\b/i,    right: 'believe' },
      { wrong: /\baccomodat/i,    right: 'accommodat' },
    ];
    const typosFound = commonTypos.filter((t) => t.wrong.test(proposalText));
    if (typosFound.length > 0) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'VOICE-TYPO-COMMON-001',
        title: `${typosFound.length} common typo(s) detected`,
        body: 'Typos in proposals kill credibility instantly. Most clients won\'t mention it — they\'ll just delete.',
        fix: `Fix: ${typosFound.map((t) => `→ ${t.right}`).join(', ')}`,
      }));
    }

    return findings;
  },
};
