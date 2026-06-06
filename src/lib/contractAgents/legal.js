/**
 * legal.js — Legal Protection Lawyer
 *
 * Reviews the 7 protective clauses every freelance contract should have.
 *
 * NOT a substitute for a real solicitor. This is a "did you forget the
 * basics" check before you sign.
 */

import { finding } from './framework.js';

export const legalProtectionLawyer = {
  id: 'legal',
  name: 'Aurelia Stone',
  role: 'Legal Protection Lawyer',
  expertiseAreas: ['Freelance contracts', 'IP licensing', 'Liability caps', 'UK + EU contract law'],
  yearsExperience: 23,
  systemPrompt: 'You are a senior commercial lawyer reviewing a freelance contract on behalf of the freelancer. Flag missing protections + one-sided clauses. NOT legal advice — flag for review.',

  review(ctx) {
    const findings = [];
    const { contractText, wordCount: words, clauses, oneSidedPhrases } = ctx;

    if (!contractText || words < 15) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'CONTRACT-EMPTY-001',
        title: 'Contract is empty or extremely short',
        body: 'No contract content to review.',
        fix: 'Generate or paste the full contract before review.',
      }));
      return findings;
    }

    // CONTRACT-LIAB-001 — no limitation of liability
    if (!clauses.limitationOfLiability) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'CONTRACT-LIAB-001',
        title: 'No limitation of liability clause',
        body: 'Without a liability cap, you could be personally on the hook for unlimited damages (e.g. if your code causes a client outage and they sue for lost revenue).',
        fix: 'Add: "In no event shall Contractor\'s aggregate liability exceed the total fees paid under this agreement in the preceding 12 months. Contractor shall not be liable for consequential, indirect, or punitive damages."',
      }));
    }

    // CONTRACT-IP-001 — no IP ownership clause
    if (!clauses.ipOwnership) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'CONTRACT-IP-001',
        title: 'No intellectual property / ownership clause',
        body: 'Without an explicit IP clause, ownership is ambiguous. You may not own your own past work patterns; the client may not legally own what you deliver.',
        fix: 'Add: "Upon receipt of full payment, Contractor assigns all rights in the deliverables to Client. Contractor retains the right to use general skills, knowledge, and pre-existing IP."',
      }));
    }

    // CONTRACT-TERMINATION-001 — no termination clause
    if (!clauses.termination) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'CONTRACT-TERMINATION-001',
        title: 'No termination clause',
        body: 'Without a clear termination clause, ending the engagement becomes a dispute.',
        fix: 'Add: "Either party may terminate with 14 days written notice for convenience, or immediately for material breach. Upon termination, Contractor will be paid for work completed up to the termination date."',
      }));
    }

    // CONTRACT-INDEMNITY-001 — no indemnity OR unlimited freelancer indemnity
    if (!clauses.indemnity) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'CONTRACT-INDEMNITY-MISSING-001',
        title: 'No indemnity clause',
        body: 'Without indemnity, neither party is protected against third-party claims (e.g. client sued for IP infringement based on your code).',
        fix: 'Add a mutual indemnity: "Each party shall indemnify the other against third-party claims arising from its own breach or wrongful acts."',
      }));
    }

    // CONTRACT-CONFIDENTIAL-001 — no confidentiality clause
    if (!clauses.confidentiality) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'CONTRACT-CONFIDENTIAL-001',
        title: 'No confidentiality / NDA clause',
        body: 'Without an NDA clause, sharing client info (case studies, references) and using their IP becomes a legal grey area.',
        fix: 'Add: "Both parties agree to maintain in confidence all non-public information disclosed during the engagement, for a period of 3 years after termination."',
      }));
    }

    // CONTRACT-LAW-001 — no governing law
    if (!clauses.governingLaw) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'CONTRACT-LAW-001',
        title: 'No governing law / jurisdiction clause',
        body: 'Without a governing law clause, disputes get expensive — courts may have to determine jurisdiction first.',
        fix: 'Add: "This Agreement shall be governed by the laws of England and Wales. The parties submit to the exclusive jurisdiction of the English courts."',
      }));
    }

    // CONTRACT-SCOPE-001 — no scope-change / change-order clause
    if (!clauses.scopeChange) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'CONTRACT-SCOPE-001',
        title: 'No scope-change / change-order clause',
        body: 'Without a change-order process, every "can you also do X" turns into either free work or a fight.',
        fix: 'Add: "Any change to the scope of work must be agreed in writing, with associated fee and timeline impact. Out-of-scope work will be quoted at Contractor\'s standard hourly rate."',
      }));
    }

    // CONTRACT-WARRANTY-001 — no warranty disclaimer
    if (!clauses.warranty) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'CONTRACT-WARRANTY-001',
        title: 'No warranty clause',
        body: 'Without a warranty disclaimer, you may be on the hook for implied warranties (fitness for purpose, merchantability).',
        fix: 'Add: "The deliverables are provided AS-IS. Contractor disclaims all warranties, express or implied, except as expressly stated."',
      }));
    }

    // CONTRACT-FORCE-MAJEURE-001 — no force majeure
    if (!clauses.forceMajeure) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'CONTRACT-FORCE-MAJEURE-001',
        title: 'No force-majeure clause',
        body: 'Without force majeure, a major disruption (pandemic, natural disaster, cyber attack) leaves both parties exposed to non-performance claims.',
        fix: 'Add: "Neither party shall be liable for delays caused by force majeure events beyond reasonable control."',
      }));
    }

    // CONTRACT-ONE-SIDED-001 — one-sided phrases detected
    if (oneSidedPhrases.length > 0) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'CONTRACT-ONE-SIDED-001',
        title: `${oneSidedPhrases.length} one-sided clause(s) detected`,
        body: 'Found language heavily favourable to the other party (e.g. "client may terminate at any time without notice", "contractor shall indemnify"). Negotiate or remove.',
        fix: 'Make the clauses mutual or add reciprocity. e.g. termination rights both ways, mutual indemnity.',
      }));
    }

    // CONTRACT-PERPETUAL-LICENSE-001 — specifically watch for perpetual license without payment
    if (/\bperpetual\s+(?:license|right|grant)\b/i.test(contractText) &&
        !/upon (?:full )?payment|upon receipt of payment/i.test(contractText)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'CONTRACT-PERPETUAL-LICENSE-001',
        title: 'Perpetual license granted without payment condition',
        body: 'You\'re granting a forever-license without tying it to payment. Client could use your work indefinitely without paying.',
        fix: 'Add "upon receipt of full payment" before any perpetual rights grant.',
      }));
    }

    return findings;
  },
};
