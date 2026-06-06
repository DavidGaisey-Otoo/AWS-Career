/**
 * pricing.js — Pricing Strategist
 *
 * Reviews pricing clarity, scope definition, timeline specificity,
 * payment terms, scope creep guardrails.
 */

import {
  finding, PRICING_REGEX, PRICING_FREE_REGEX, TIMELINE_REGEX,
  PAYMENT_TERMS_REGEX, SCOPE_IN_REGEX, SCOPE_OUT_REGEX,
} from './framework.js';

export const pricingStrategist = {
  id: 'pricing',
  name: 'Hannes Müller',
  role: 'Pricing & Scope Strategist',
  expertiseAreas: ['Pricing models', 'Scope definition', 'Payment terms', 'Scope creep prevention'],
  yearsExperience: 19,
  systemPrompt: 'You are a senior consultancy pricing strategist with 19 years experience. Review the proposal for pricing clarity, scope definition, payment terms, and scope-creep guardrails. Flag anything that would lead to disputes later.',

  review(ctx) {
    const findings = [];
    const { proposalText, hasPricing, hasTimeline, hasPaymentTerms, hasInScope, hasOutScope, phaseCount, wordCount: words } = ctx;

    // PROP-PRICE-MISSING-001 — no pricing at all
    if (!hasPricing && words >= 70) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'PROP-PRICE-MISSING-001',
        title: 'No pricing mentioned anywhere',
        body: 'Clients expect a price — or at least a price range — in any serious proposal. Without it they assume you\'re expensive and disqualify you.',
        fix: 'Add an "Investment" section: total project price OR hourly + estimated hours OR a clear range ("$8k-$12k depending on integration count").',
      }));
    }

    // PROP-PRICE-FREE-001 — proposal says "free" without context
    if (PRICING_FREE_REGEX.test(proposalText) && !PRICING_REGEX.test(proposalText)) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PROP-PRICE-FREE-001',
        title: '"Free" mentioned but no paid pricing',
        body: 'Offering everything free signals desperation or hidden costs.',
        fix: 'If a discovery call is free, label it: "Free 15-minute discovery call (no obligation)." Then state the project price separately.',
      }));
    }

    // PROP-TIMELINE-001 — no timeline
    if (!hasTimeline && words >= 70) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PROP-TIMELINE-001',
        title: 'No timeline specified',
        body: 'Clients want to know when they\'ll have working software. No timeline = scope risk in their head.',
        fix: 'Add a concrete timeline: "Discovery 1 week → Build 4 weeks → Handover 1 week. Launch end of week 6."',
      }));
    }

    // PROP-PAYMENT-TERMS-001 — no payment terms
    if (!hasPaymentTerms && hasPricing && words >= 150) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PROP-PAYMENT-TERMS-001',
        title: 'No payment terms specified',
        body: 'You\'ve given a price but no terms (deposit, milestones, net days). This is the #1 cause of post-signing disputes.',
        fix: 'Add: "50% on signing, 25% at midpoint review, 25% on handover. Net-7 invoicing." OR "Hourly invoicing, weekly, net-14."',
      }));
    }

    // PROP-SCOPE-IN-001 — no in-scope deliverables listed
    if (!hasInScope && words >= 150) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PROP-SCOPE-IN-001',
        title: 'No explicit deliverables list',
        body: 'Without a bulleted "what you get" list, clients fill the gap with their own assumptions — usually more than you scoped.',
        fix: 'Add a "Deliverables" section: 3-7 concrete items the client receives (e.g. "Terraform repo, deployed prod VPC + ALB + ECS service, runbook PDF, 1 hour handover call").',
      }));
    }

    // PROP-SCOPE-OUT-001 — no exclusions / out-of-scope
    if (!hasOutScope && words >= 200) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PROP-SCOPE-OUT-001',
        title: 'No "out of scope" section',
        body: 'Explicit exclusions prevent scope creep. Without them, every "small extra" becomes a fight.',
        fix: 'Add 2-3 exclusions: "Out of scope: ongoing support after handover, third-party SaaS licenses, content / copy creation."',
      }));
    }

    // PROP-PHASES-001 — no breakdown into phases for larger projects
    if (words >= 250 && phaseCount === 0) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'PROP-PHASES-001',
        title: 'Project not broken into phases',
        body: 'Clients trust phased delivery. A 6-week project that\'s "all in one push" feels riskier than the same 6 weeks broken into Discovery / Build / Handover.',
        fix: 'Split into 3-5 phases with mini-milestones. Pin payment to phase completion.',
      }));
    }

    // PROP-PRICE-RANGE-001 — single price with no rationale = looks arbitrary
    const dollarMatches = proposalText.match(PRICING_REGEX);
    if (dollarMatches && dollarMatches.length === 1 && words >= 200 && !/\b(?:based on|because|given|assuming|includes|covers)\b/i.test(proposalText)) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'PROP-PRICE-RATIONALE-001',
        title: 'Pricing has no rationale',
        body: 'A single price tag with no explanation feels arbitrary. Clients then haggle.',
        fix: 'Tie the number to scope: "$8,000 covers the audit, the Terraform refactor, and the rollout. Assumes 1 prod + 1 staging environment."',
      }));
    }

    // PROP-DAY-RATE-OK-001 — positive — proposal has both daily rate AND day estimate
    const hasDayRate = /\$\s*[\d,]+\s*\/\s*day\b/i.test(proposalText);
    const hasDayEstimate = /\b\d+\s*(?:days?|weeks?)\b/i.test(proposalText);
    if (hasDayRate && hasDayEstimate) {
      findings.push(finding({
        severity: 'info',
        ruleId: 'PROP-DAY-RATE-OK-001',
        title: 'Day rate + day estimate together',
        body: 'Strong combo — client can compute the total themselves and trust the math.',
      }));
    }

    return findings;
  },
};
