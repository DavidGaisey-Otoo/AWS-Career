/**
 * deliverability.js — Email Deliverability Expert
 *
 * Catches the spam-filter triggers + legal compliance issues that
 * stop emails ever reaching the inbox.
 *
 * Based on: Gmail's Postmaster guide, Mailchimp Compliance, CAN-SPAM,
 * UK PECR + GDPR Art. 22, RFC 5322.
 */

import {
  finding, SHORTENER_REGEX, URL_REGEX, isAllCaps, wordCount,
} from './framework.js';

export const deliverabilityExpert = {
  id: 'deliverability',
  name: 'Mason Reilly',
  role: 'Email Deliverability Expert',
  expertiseAreas: ['Spam filters', 'CAN-SPAM/GDPR/PECR', 'Inbox placement', 'Authentication (SPF/DKIM/DMARC)'],
  yearsExperience: 18,
  systemPrompt: 'You are a senior email deliverability expert with 18 years experience at ISPs and ESPs. Review the subject + body for any signals that would trip Gmail/Outlook spam filters or violate CAN-SPAM/GDPR. Be specific.',

  review(ctx) {
    const findings = [];
    const { subject, body, fullText, spamHits, intent, hasUnsubscribe, fromName } = ctx;

    // EMAIL-EMPTY-SUBJ-001 — empty subject is auto-spam
    if (!subject || subject.trim().length === 0) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'EMAIL-EMPTY-SUBJ-001',
        title: 'Empty subject line',
        body: 'Emails with no subject line are routed to spam by most providers and have near-zero open rates.',
        fix: 'Write a 30-60 character subject that previews the value of the email.',
      }));
    }

    // EMAIL-SUBJECT-LENGTH-001 — too short or too long
    if (subject && subject.length > 0 && subject.length < 15) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'EMAIL-SUBJECT-LENGTH-SHORT-001',
        title: 'Subject is very short',
        body: `Subjects under 15 characters look low-effort or like spam. Yours is ${subject.length} characters.`,
        fix: 'Aim for 30-60 characters. Include the value or the recipient\'s name.',
        evidence: subject,
      }));
    } else if (subject && subject.length > 70) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'EMAIL-SUBJECT-LENGTH-LONG-001',
        title: 'Subject will be truncated on mobile',
        body: `Subjects over 70 characters get cut off in mobile inbox previews. Yours is ${subject.length} characters.`,
        fix: 'Shorten to under 60 characters. Put the key word first.',
        evidence: subject,
      }));
    }

    // EMAIL-ALL-CAPS-001 — all-caps subject = spam signal
    if (isAllCaps(subject)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'EMAIL-ALL-CAPS-001',
        title: 'Subject is ALL CAPS',
        body: 'All-caps subjects are a strong spam-filter trigger and look unprofessional.',
        fix: 'Use sentence case — capitalize only the first word + proper nouns.',
        evidence: subject,
      }));
    }

    // EMAIL-MULTI-EXCLAIM-001 — multiple exclamation marks
    const exclaims = (subject.match(/!/g) || []).length;
    if (exclaims >= 2) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'EMAIL-MULTI-EXCLAIM-001',
        title: 'Multiple exclamation marks in subject',
        body: `Subject contains ${exclaims} exclamation marks. Two or more is a strong spam signal.`,
        fix: 'Remove all but at most one exclamation mark.',
        evidence: subject,
      }));
    }

    // EMAIL-MULTI-QUESTION-001 — multiple question marks
    const questions = (subject.match(/\?/g) || []).length;
    if (questions >= 2) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'EMAIL-MULTI-QUESTION-001',
        title: 'Multiple question marks in subject',
        body: 'Repeated question marks look spammy.',
        fix: 'Keep at most one question mark.',
        evidence: subject,
      }));
    }

    // EMAIL-SPAM-WORDS-001 — known spam-trigger phrases
    if (spamHits.length >= 3) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'EMAIL-SPAM-WORDS-001',
        title: `${spamHits.length} known spam-trigger phrases detected`,
        body: `Phrases like "${spamHits.slice(0, 3).join('", "')}" are on every major ESP's filter list. Three or more almost guarantees the spam folder.`,
        fix: 'Rewrite without these phrases. Speak as a human, not a marketing template.',
        evidence: spamHits.slice(0, 5).join(' · '),
      }));
    } else if (spamHits.length >= 1) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'EMAIL-SPAM-WORDS-LIGHT-001',
        title: `${spamHits.length} spam-trigger phrase(s) detected`,
        body: `Found: "${spamHits.join('", "')}". On their own these won't filter you, but combined with other signals they add up.`,
        fix: 'Consider rewording.',
        evidence: spamHits.join(' · '),
      }));
    }

    // EMAIL-DOLLAR-001 — dollar signs (subject OR body $$$ pattern)
    if (/\$\$|\$\s*\d/.test(subject) || /\${2,}/.test(body)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'EMAIL-DOLLAR-001',
        title: 'Multiple dollar signs detected',
        body: 'Currency symbols, especially $$$, in subject or body are classic spam patterns.',
        fix: 'Move pricing to the body using "$X,XXX" not "$$$". Frame as value, not just price.',
        evidence: /\${2,}/.test(body) ? '$$ in body' : subject,
      }));
    }

    // EMAIL-LINK-RATIO-001 — too many links for body length
    const linkCount = ctx.bodyLinks.length;
    const words = ctx.bodyWordCount;
    if (words > 0 && linkCount > 0) {
      const ratio = linkCount / words;
      if (ratio > 0.05 && linkCount >= 3) {
        findings.push(finding({
          severity: 'high',
          ruleId: 'EMAIL-LINK-RATIO-001',
          title: 'Too many links for the amount of text',
          body: `${linkCount} links in ${words} words. Anything over 1 link per 100 words triggers spam scoring.`,
          fix: 'Trim to 1-2 links. Make the rest plain text references.',
        }));
      }
    }

    // EMAIL-SHORTENER-001 — URL shorteners are spam signal
    if (SHORTENER_REGEX.test(body)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'EMAIL-SHORTENER-001',
        title: 'URL shortener detected',
        body: 'Links from bit.ly, tinyurl, t.co, etc. are spam-filter red flags. Recipients also can\'t see where the link goes.',
        fix: 'Use the full destination URL or a branded short URL on your own domain.',
      }));
    }

    // EMAIL-UNSUB-001 — bulk-style outreach needs unsubscribe (CAN-SPAM + GDPR)
    if ((intent === 'outreach' || intent === 'newsletter') && !hasUnsubscribe) {
      findings.push(finding({
        severity: intent === 'newsletter' ? 'critical' : 'medium',
        ruleId: 'EMAIL-UNSUB-001',
        title: 'No unsubscribe / opt-out path',
        body: intent === 'newsletter'
          ? 'Newsletters legally require an unsubscribe mechanism (CAN-SPAM §5, GDPR Art. 21, UK PECR Reg. 22).'
          : 'For cold outreach, including "Let me know if you\'d rather not hear from me" is best practice and protects against complaints.',
        fix: 'Add a clear opt-out line at the bottom.',
      }));
    }

    // EMAIL-FROM-NAME-001 — no from-name
    if (!fromName || fromName.trim().length === 0) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'EMAIL-FROM-NAME-001',
        title: 'No "From" name configured',
        body: 'Emails arriving from a bare address (no display name) get treated as suspicious.',
        fix: 'Set a display name like "Your Name — Your Company".',
      }));
    }

    // EMAIL-ATTACH-WARN-001 — mentions attachment without context
    if (/\bsee attached\b|\battached (?:please|is|file|document)\b/i.test(body)
        && !/\.\w{2,5}\b/.test(body)) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'EMAIL-ATTACH-WARN-001',
        title: 'References "attached" without naming the file',
        body: 'Generic "see attached" with no filename is a phishing pattern.',
        fix: 'Name the file explicitly: "I\'ve attached the proposal (proposal-v1.pdf) below."',
      }));
    }

    // EMAIL-BODY-LENGTH-001 — too short or too long
    if (words > 0 && words < 20) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'EMAIL-BODY-TOO-SHORT-001',
        title: 'Body is very short',
        body: `Only ${words} words. Suspiciously short emails get flagged.`,
        fix: 'Aim for 50-150 words for outreach, 150-400 for proposals.',
      }));
    } else if (words > 600 && intent === 'outreach') {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'EMAIL-BODY-TOO-LONG-001',
        title: 'Outreach body is too long',
        body: `${words} words is too much for first contact. Reply rates drop sharply over 200 words.`,
        fix: 'Trim to under 150 words. Save details for the reply.',
      }));
    }

    // EMAIL-NO-LINKS-IN-NEWSLETTER-001 — newsletters need at least one link
    if (intent === 'newsletter' && linkCount === 0) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'EMAIL-NO-LINKS-IN-NEWSLETTER-001',
        title: 'Newsletter has no links',
        body: 'Newsletters without any links can\'t track engagement or drive traffic.',
        fix: 'Add at least one clickable link.',
      }));
    }

    return findings;
  },
};
