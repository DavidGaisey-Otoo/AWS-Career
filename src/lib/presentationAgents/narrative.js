/**
 * narrative.js — Narrative Architect.
 *
 * Reviews the deck's story arc: does it have a title, problem,
 * solution, proof, timeline, ask, close? Are they in the right order?
 */

import { finding } from './framework.js';

export const narrativeArchitect = {
  id: 'narrative',
  name: 'Liam O\'Brien',
  role: 'Narrative Architect',
  expertiseAreas: ['Story arc', 'Pitch flow', 'Audience engagement', 'Persuasion'],
  yearsExperience: 18,
  systemPrompt: 'You are a senior pitch consultant with 18 years experience reviewing B2B sales decks. Audit the slide flow for story arc, missing sections, ordering.',

  review(ctx) {
    const findings = [];
    const { slides, slideCount, intents, intentSet, audience } = ctx;

    if (slideCount === 0) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'PRES-EMPTY-001',
        title: 'Empty deck',
        body: 'No slides to review.',
        fix: 'Generate or add slides before review.',
      }));
      return findings;
    }

    // PRES-SLIDE-COUNT-001 — too few or too many slides
    if (slideCount < 5) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PRES-SLIDE-COUNT-LOW-001',
        title: `Only ${slideCount} slide(s)`,
        body: 'Short decks struggle to tell a complete story. The standard 10-slide structure (Pitch Anything, Guy Kawasaki) is the sweet spot.',
        fix: 'Expand to 8-12 slides. Add Problem → Solution → Proof → Pricing → Timeline → Ask.',
      }));
    } else if (slideCount > 20) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PRES-SLIDE-COUNT-HIGH-001',
        title: `${slideCount} slides is long`,
        body: 'Clients zone out after 10-15 minutes. Long decks signal "we don\'t know what to leave out".',
        fix: 'Trim to 10-15 slides. Move details to an appendix or follow-up doc.',
      }));
    }

    // PRES-NO-TITLE-001 — first slide isn't a title
    if (intents[0] !== 'title') {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PRES-NO-TITLE-001',
        title: 'First slide isn\'t a clear title slide',
        body: 'Decks should open with a title slide setting context: project name, your name, date.',
        fix: 'Make slide 1 a clean title: project name, your name + role, date, client logo if appropriate.',
        slideIndex: 0,
      }));
    }

    // PRES-NO-PROBLEM-001 — no problem / context slide
    if (!intentSet.has('problem')) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PRES-NO-PROBLEM-001',
        title: 'No "problem" or "context" slide',
        body: 'Decks without a problem statement skip straight to "we\'re great" — the client never feels you understand them.',
        fix: 'Add a "The challenge" or "Where you are today" slide that mirrors the client\'s pain in their own words.',
      }));
    }

    // PRES-NO-SOLUTION-001 — no solution slide
    if (!intentSet.has('solution')) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'PRES-NO-SOLUTION-001',
        title: 'No "solution" or "approach" slide',
        body: 'A pitch without a solution slide is incomplete. Client doesn\'t know what you actually do.',
        fix: 'Add a "Our approach" or "The plan" slide laying out how you\'ll solve their problem.',
      }));
    }

    // PRES-NO-PROOF-001 — no credentials / proof slide
    if (!intentSet.has('proof') && slideCount >= 6) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PRES-NO-PROOF-001',
        title: 'No proof / credentials / case study slide',
        body: 'Without a "why us" slide, you\'re asking the client to trust strangers.',
        fix: 'Add a slide with: cert, key past clients, one-line case study, headline metrics.',
      }));
    }

    // PRES-NO-PRICING-001 — no pricing slide
    if (!intentSet.has('pricing') && audience === 'client') {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PRES-NO-PRICING-001',
        title: 'No pricing / investment slide',
        body: 'Client pitches without explicit pricing leave the buyer guessing — they assume expensive and walk away.',
        fix: 'Add an "Investment" slide: total price OR price range OR rate + hours estimate. Frame as value.',
      }));
    }

    // PRES-NO-TIMELINE-001 — no timeline / milestone slide
    if (!intentSet.has('timeline') && slideCount >= 6) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PRES-NO-TIMELINE-001',
        title: 'No timeline / milestones slide',
        body: 'Without a timeline, the client can\'t mentally plan around your delivery.',
        fix: 'Add a "Timeline" slide: 3-5 phases mapped to weeks/months, with key milestones.',
      }));
    }

    // PRES-NO-ASK-001 — no clear CTA / next steps slide
    if (!intentSet.has('ask') && !intentSet.has('thanks')) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PRES-NO-ASK-001',
        title: 'No "next steps" / call-to-action slide',
        body: 'Decks that end without a clear ask leave the client to figure out next steps themselves. They won\'t.',
        fix: 'Add a "Next steps" slide: "Book a discovery call by Friday" / "Sign + 50% deposit to kick off Monday".',
      }));
    }

    // PRES-ORDER-001 — pricing before solution feels rushed
    const idxSol = intents.indexOf('solution');
    const idxPrice = intents.indexOf('pricing');
    if (idxSol > -1 && idxPrice > -1 && idxPrice < idxSol) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PRES-ORDER-001',
        title: 'Pricing comes before solution',
        body: 'Showing price before the client sees your approach makes the number feel like sticker shock.',
        fix: 'Reorder so pricing comes after solution + proof — by then they\'re sold on the value.',
      }));
    }

    // PRES-ORDER-PROBLEM-001 — problem after solution
    const idxProb = intents.indexOf('problem');
    if (idxProb > -1 && idxSol > -1 && idxProb > idxSol) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'PRES-ORDER-PROBLEM-001',
        title: 'Problem appears after solution',
        body: 'You\'re showing the solution before naming the problem. Audience hasn\'t bought into the pain yet.',
        fix: 'Move the problem slide ahead of the solution.',
      }));
    }

    return findings;
  },
};
