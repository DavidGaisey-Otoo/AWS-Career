/**
 * discoveryAutoAnswer.js — answers the standard discovery checklist
 * automatically from the analyzed brief.
 *
 * The user shouldn't have to re-type anything already in the brief.
 * Each question gets either:
 *   { answer: '...', confidence: 'high' | 'medium' | 'low', source: 'brief'|'inferred' }
 *  or
 *   { answer: null, askThis: true }   ← truly missing
 *
 * The Discovery Call Prep page consumes this to pre-fill its form.
 */

import { SERVICE_MATRIX } from '../data/awsServiceMatrix.js';

const QUESTIONS = [
  // 1
  { id: 'project-name',     label: 'Project name', resolver: ({ analysis, raw, suggestedName }) =>
      suggestedName || analysis.client || extractFromRegex(raw, /(?:project|build|need)\s+(?:a|the|an)?\s*([A-Z][\w\s-]{4,40})/i) },

  { id: 'client-company',   label: 'Client / company', resolver: ({ analysis }) => analysis.client },

  { id: 'industry',         label: 'Industry / domain', resolver: ({ analysis }) =>
      analysis.compliance?.length ? mapComplianceToIndustry(analysis.compliance) : null },

  { id: 'project-type',     label: 'Type of project', resolver: ({ analysis }) =>
      analysis.projectTypes?.map((p) => p.label).join(' + ') },

  { id: 'region',           label: 'Target AWS region', resolver: ({ analysis }) => analysis.region },

  { id: 'compliance',       label: 'Compliance requirements', resolver: ({ analysis }) =>
      analysis.compliance?.map((c) => c.label).join(', ') },

  { id: 'budget-fixed',     label: 'Project budget (fixed fee)', resolver: ({ analysis }) =>
      analysis.budget?.fixed ? `${analysis.budget.fixed} ${analysis.budget.currency}` : null },

  { id: 'budget-monthly',   label: 'AWS monthly cap', resolver: ({ analysis }) =>
      analysis.budget?.awsMonthly ? `≤ $${analysis.budget.awsMonthly}/mo on AWS` : null },

  { id: 'timeline',         label: 'Timeline', resolver: ({ analysis }) => analysis.timeline },

  { id: 'urgency',          label: 'Urgency level', resolver: ({ analysis }) =>
      analysis.urgency === 'critical' ? '🔴 Critical' :
      analysis.urgency === 'high' ? '🟠 High' : '🟢 Normal' },

  { id: 'services',         label: 'Required AWS services', resolver: ({ analysis }) =>
      analysis.services?.length ? `${analysis.services.length} services: ${analysis.services.slice(0, 8).map((s) => s.label).join(', ')}${analysis.services.length > 8 ? '…' : ''}` : null },

  { id: 'deployment-method',label: 'Preferred deployment method', resolver: ({ analysis }) =>
      analysis.deploymentMethods?.length ? analysis.deploymentMethods.map((m) => m.toUpperCase()).join(', ') : null },

  { id: 'deliverables',     label: 'Expected deliverables', resolver: ({ analysis, raw }) =>
      analysis.facts?.deliverables || extractFromRegex(raw, /deliverables?:?\s*([^.]+)/i) },

  { id: 'success-criteria', label: 'Success criteria', resolver: ({ raw }) =>
      extractFromRegex(raw, /success(?:\s+criteria)?:?\s*([^.]+)/i) ||
      extractFromRegex(raw, /(?:must|need\s+to)\s+(?:be\s+able\s+to\s+)?([^.,;]{20,80})/i) },

  { id: 'domain',           label: 'Custom domain', resolver: ({ raw }) =>
      extractFromRegex(raw, /\b((?:[a-z0-9-]+\.)+(?:com|co\.uk|io|net|org|app|dev|ai|cloud))\b/i) },

  { id: 'data-volume',      label: 'Data volume / scale', resolver: ({ raw }) =>
      extractFromRegex(raw, /(\d+[\s,]*\d*\s*(?:users?|customers?|requests?\/(?:sec|day|month)|gb|tb|mb))/i) },

  { id: 'support-period',   label: 'Post-handover support', resolver: ({ raw }) =>
      extractFromRegex(raw, /(\d+\s*(?:days?|weeks?|months?))\s+(?:support|maintenance|handover)/i) },

  { id: 'team-size',        label: 'Team size', resolver: ({ raw }) =>
      extractFromRegex(raw, /(\d+)\s+(?:developers?|engineers?|users?\s+(?:on\s+the\s+)?team)/i) },
];

function extractFromRegex(text, re) {
  if (!text) return null;
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function mapComplianceToIndustry(compliance) {
  const ids = compliance.map((c) => c.id);
  if (ids.includes('hipaa')) return 'Healthcare';
  if (ids.includes('pci-dss')) return 'Finance / Fintech';
  if (ids.includes('ferpa')) return 'Education';
  if (ids.includes('fedramp')) return 'Government / Public Sector';
  if (ids.includes('gdpr')) return 'EU consumer-facing';
  return null;
}

/**
 * Run all questions and return a structured answer set.
 *
 * @param {object} input  { analysis, raw, suggestedName }
 * @returns {Array<{ id, label, answer, autoAnswered, confidence, askThis }>}
 */
export function autoAnswerDiscovery(input) {
  return QUESTIONS.map((q) => {
    let answer = null;
    try { answer = q.resolver(input); } catch { answer = null; }
    if (answer && typeof answer === 'string') answer = answer.trim();
    const filled = !!answer;
    return {
      id: q.id,
      label: q.label,
      answer,
      autoAnswered: filled,
      askThis: !filled,
      confidence: filled ? 'high' : 'low',
      source: filled ? 'brief' : 'missing',
    };
  });
}

/**
 * Quick count of how many questions got auto-answered vs need asking.
 */
export function discoveryStats(answers) {
  const done = answers.filter((a) => a.autoAnswered).length;
  const missing = answers.length - done;
  return { done, missing, total: answers.length, percent: Math.round((done / answers.length) * 100) };
}

export const DISCOVERY_QUESTIONS_TOTAL = QUESTIONS.length;
