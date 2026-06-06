/**
 * starCoach.js — STAR Interview Coach.
 *
 * Reviews answer structure (STAR), specificity, length, filler.
 */

import { finding } from './framework.js';

export const starCoach = {
  id: 'starCoach',
  name: 'Naoko Tanaka',
  role: 'Interview Answer Coach',
  expertiseAreas: ['STAR method', 'Behavioural interviews', 'Tech screens', 'Story crafting'],
  yearsExperience: 17,
  systemPrompt: 'You are a senior tech recruiter who has coached engineers through Big Tech interviews for 17 years. Review the answer for STAR structure + specificity.',

  review(ctx) {
    const findings = [];
    const { question, answer, questionType, wordCount: words, weakWords, starParts, hasNumber } = ctx;

    if (!answer || words < 5) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'INT-EMPTY-001',
        title: 'Empty or near-empty answer',
        body: 'No answer to review.',
        fix: 'Provide your full answer to the question.',
      }));
      return findings;
    }

    // INT-LENGTH-SHORT — too short (< 50 words) for substantive answer
    if (words < 50 && questionType === 'behavioural') {
      findings.push(finding({
        severity: 'high',
        ruleId: 'INT-LENGTH-SHORT-001',
        title: 'Answer is too short for a behavioural question',
        body: `Only ${words} words. Behavioural answers need enough room for Situation/Task/Action/Result — typically 90-180 words for the spoken version.`,
        fix: 'Expand each STAR part with one concrete detail.',
      }));
    }

    // INT-LENGTH-LONG — rambling > 350 words
    if (words > 350) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'INT-LENGTH-LONG-001',
        title: 'Answer is too long',
        body: `${words} words. Interviewers tune out after 90 seconds (~200 words spoken).`,
        fix: 'Trim to 100-200 words. Cut anything that doesn\'t advance the story.',
      }));
    }

    // INT-NO-SITUATION — missing situation context
    if (!starParts.situation && questionType === 'behavioural') {
      findings.push(finding({
        severity: 'high',
        ruleId: 'INT-NO-SITUATION-001',
        title: 'Missing Situation / context',
        body: 'Interviewer can\'t evaluate your decisions without knowing the context (team size, project stage, constraints).',
        fix: 'Open with: "In my last role at X, we were doing Y when..."',
      }));
    }

    // INT-NO-TASK — missing the task / what you were trying to do
    if (!starParts.task && questionType === 'behavioural') {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'INT-NO-TASK-001',
        title: 'Missing Task / your specific responsibility',
        body: 'Was this team work or your individual work? What were YOU responsible for?',
        fix: 'Add: "I was responsible for X" or "My task was Y."',
      }));
    }

    // INT-NO-ACTION — no action verbs
    if (!starParts.action) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'INT-NO-ACTION-001',
        title: 'No Action / no specific things you did',
        body: 'The interviewer needs to know YOUR specific actions, not the team\'s. "We" tells them nothing about you.',
        fix: 'Rewrite using "I": "I built X", "I decided Y", "I led Z conversation".',
      }));
    }

    // INT-NO-RESULT — no measurable outcome
    if (!starParts.result && questionType === 'behavioural') {
      findings.push(finding({
        severity: 'high',
        ruleId: 'INT-NO-RESULT-001',
        title: 'Missing Result / outcome',
        body: 'Without a result, the interviewer doesn\'t know if your actions worked. Strong answers end with measurable impact.',
        fix: 'Add: "As a result, we cut latency by 60%" or "This shipped on time and saved $X/month."',
      }));
    }

    // INT-NO-NUMBERS — no specifics for behavioural / system-design
    if (!hasNumber && questionType !== 'technical' && words >= 25) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'INT-NO-NUMBERS-001',
        title: 'No specific numbers / metrics',
        body: 'Specifics beat generics. "Improved performance" loses to "cut p95 from 800ms to 230ms".',
        fix: 'Add at least one concrete number: latency, % savings, headcount, traffic volume, dollar value.',
      }));
    }

    // INT-WEAK-WORDS — too many "like, um, basically..."
    if (weakWords.length >= 3) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'INT-WEAK-WORDS-001',
        title: `${weakWords.length} filler / hedging words`,
        body: `Words like "${weakWords.slice(0, 3).join('", "')}" make answers feel unconfident in mock or recorded answers.`,
        fix: 'Remove or replace. Pause instead of saying "um".',
        evidence: weakWords.slice(0, 5).join(' · '),
      }));
    }

    // INT-WE-VS-I — too many "we" relative to "I"
    const we = (answer.match(/\b(we|our|us)\b/gi) || []).length;
    const i  = (answer.match(/\b(i|my|me)\b/gi) || []).length;
    if (we > 0 && (i === 0 || we / Math.max(i, 1) > 2)) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'INT-WE-VS-I-001',
        title: '"We" outweighs "I"',
        body: `"We/our/us" appears ${we}× vs "I/my/me" ${i}×. Interviewers want to know what YOU did.`,
        fix: 'Rewrite team statements as your own: "We deployed it" → "I led the deployment, which included...".',
      }));
    }

    // INT-MIRROR-QUESTION — answer doesn't address the actual question
    if (question && question.length > 10) {
      const qWords = (question.toLowerCase().match(/\b[a-z]{5,}\b/g) || []).filter((w) =>
        !['about', 'where', 'which', 'their', 'would', 'should'].includes(w)
      );
      const aLower = answer.toLowerCase();
      const overlap = qWords.filter((w) => aLower.includes(w)).length;
      const overlapRate = qWords.length > 0 ? overlap / qWords.length : 1;
      if (overlapRate < 0.2 && qWords.length >= 4 && words >= 30) {
        findings.push(finding({
          severity: 'high',
          ruleId: 'INT-MIRROR-QUESTION-001',
          title: 'Answer doesn\'t mirror the question',
          body: 'Your answer barely references the specific things the question asked about. Looks like you\'re telling a pre-canned story.',
          fix: 'Re-anchor to the question. Repeat 2-3 key words from the prompt in your opening sentence.',
        }));
      }
    }

    // INT-CONCRETE-OK — positive signal
    if (hasNumber && starParts.result && starParts.action) {
      findings.push(finding({
        severity: 'info',
        ruleId: 'INT-CONCRETE-OK-001',
        title: 'Answer has concrete numbers + action + result',
        body: 'Strong combo — interviewer can mentally rate the impact.',
      }));
    }

    return findings;
  },
};
