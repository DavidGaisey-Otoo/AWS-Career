/**
 * realism.js — Project Plan Realism Auditor.
 *
 * Flags unrealistic durations, missing phases, missing buffer, concurrency,
 * weekend/holiday clashes, no handover.
 */

import { finding } from './framework.js';

const PHASE_NAME_RX = {
  discovery: /\b(discovery|audit|kickoff|requirements?|planning|spike|investigation)\b/i,
  build:     /\b(build|implement|develop|construct|migrate|refactor|integration)\b/i,
  hardening: /\b(harden|securit|review|test|qa|uat|polish)\b/i,
  handover:  /\b(handover|hand[- ]?off|deliver|train|knowledge transfer|documentation|kt)\b/i,
};

export const projectPlanRealismAuditor = {
  id: 'realism',
  name: 'Esra Demir',
  role: 'Project Plan Realism Auditor',
  expertiseAreas: ['Estimation', 'PM', 'Buffer planning', 'Critical-path analysis'],
  yearsExperience: 21,
  systemPrompt: 'You are a senior delivery PM with 21 years experience shipping AWS migrations and rebuilds. Audit this plan for realism, dependencies, and buffer.',

  review(ctx) {
    const findings = [];
    const { phases, totalDays, services, level, teamSize, startDate } = ctx;

    if (!phases || phases.length === 0) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'PLAN-EMPTY-001',
        title: 'Empty plan — no phases',
        body: 'No project phases to review.',
        fix: 'Generate or define at least 2-3 phases first.',
      }));
      return findings;
    }

    // PLAN-TOTAL-SHORT — total project < 3 days is suspicious
    if (totalDays > 0 && totalDays < 3) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PLAN-TOTAL-SHORT-001',
        title: `Total project duration is only ${totalDays} day(s)`,
        body: 'Anything under 3 working days = no buffer, no handover, no testing. Likely under-scoped.',
        fix: 'Expand to at least a 1-week engagement.',
      }));
    }

    // PLAN-TOTAL-LONG — > 180 days with single-person team is risky
    if (totalDays > 180 && teamSize === 1) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PLAN-TOTAL-LONG-SOLO-001',
        title: `${totalDays}-day solo project`,
        body: 'Solo projects > 6 months have high abandonment + sickness risk. No bus factor.',
        fix: 'Split into smaller milestone-billed phases. Document everything as you go for backup continuity.',
      }));
    }

    // PLAN-MISSING-PHASES — typical engagement lacks one of D/B/H/HO
    const present = {};
    for (const ph of phases) {
      const name = String(ph.name || '');
      for (const [key, rx] of Object.entries(PHASE_NAME_RX)) {
        if (rx.test(name)) present[key] = true;
      }
    }

    if (!present.discovery && totalDays >= 7) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PLAN-NO-DISCOVERY-001',
        title: 'No Discovery / Audit / Planning phase',
        body: 'Jumping straight to build without discovery causes mid-project pivots. Clients also need to feel the engagement starts with you learning their context.',
        fix: 'Add a 3-7 day Discovery phase: audit current state, lock scope, confirm AWS account access.',
      }));
    }

    if (!present.handover && totalDays >= 14) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PLAN-NO-HANDOVER-001',
        title: 'No Handover / Knowledge Transfer phase',
        body: 'Without an explicit handover phase, clients can\'t operate what you built and you get pulled back in for "just one more question" calls forever.',
        fix: 'Add a 2-5 day Handover: runbook PDF, architecture diagram, 1-2 hour walkthrough call, 30-day Q&A window.',
      }));
    }

    if (!present.hardening && totalDays >= 21) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PLAN-NO-HARDENING-001',
        title: 'No Hardening / QA / Security phase',
        body: 'For projects > 3 weeks, skipping a hardening phase means security/perf work gets squeezed at the end.',
        fix: 'Add a 3-7 day Hardening phase between Build and Handover.',
      }));
    }

    // PLAN-NO-BUFFER — last phase ends exactly on total (no buffer for unknowns)
    const lastEnd = phases.reduce((max, p) => Math.max(max, Number(p.endDay) || 0), 0);
    const bufferDays = totalDays - lastEnd;
    if (totalDays >= 14 && bufferDays <= 0) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PLAN-NO-BUFFER-001',
        title: 'Plan has no buffer at the end',
        body: 'Real projects always overrun on at least one phase. With zero buffer, any slip pushes the launch date.',
        fix: 'Add 10-15% buffer at the end of the plan. For a 6-week project, that\'s 3-5 working days.',
      }));
    }

    // PLAN-PHASE-TOO-SHORT — phase < 2 days is a milestone, not a phase
    const tooShort = phases.filter((p) => Number(p.durationDays) > 0 && Number(p.durationDays) < 2);
    if (tooShort.length > 0) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PLAN-PHASE-TOO-SHORT-001',
        title: `${tooShort.length} phase(s) shorter than 2 days`,
        body: `Phases like "${tooShort.map((p) => p.name).slice(0, 3).join('", "')}" are too small to be real phases — they\'re tasks or milestones.`,
        fix: 'Merge tiny phases into a parent phase, or call them "milestones" instead of "phases".',
      }));
    }

    // PLAN-PHASE-TOO-LONG — single phase > 60 days needs splitting
    const tooLong = phases.filter((p) => Number(p.durationDays) > 60);
    if (tooLong.length > 0) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PLAN-PHASE-TOO-LONG-001',
        title: `${tooLong.length} phase(s) longer than 60 days`,
        body: 'Phases > 60 days have no internal checkpoint. Risk of "we discover at the end that it was off-track".',
        fix: 'Split into sub-phases with mid-point milestones.',
      }));
    }

    // PLAN-OVERLAP-001 — phases overlap when teamSize=1
    if (teamSize === 1 && phases.length >= 2) {
      const sorted = [...phases].sort((a, b) => (Number(a.startDay) || 0) - (Number(b.startDay) || 0));
      let overlaps = 0;
      for (let i = 1; i < sorted.length; i++) {
        if ((Number(sorted[i].startDay) || 0) < (Number(sorted[i - 1].endDay) || 0)) overlaps++;
      }
      if (overlaps > 0) {
        findings.push(finding({
          severity: 'high',
          ruleId: 'PLAN-OVERLAP-SOLO-001',
          title: `${overlaps} phase overlap(s) with solo team`,
          body: 'A single contractor can\'t actually run two phases simultaneously. Overlaps will slip.',
          fix: 'Sequence phases properly, or split work into parallel tracks if you genuinely have multiple people.',
        }));
      }
    }

    // PLAN-COMPLIANCE-001 — services indicate compliance but no dedicated hardening
    const hasCompliance = services.some((s) => /waf|kms|cloudtrail|guardduty|inspector|securityhub|config/.test(s));
    if (hasCompliance && !present.hardening) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PLAN-COMPLIANCE-NO-HARDEN-001',
        title: 'Compliance-class services without dedicated hardening phase',
        body: 'WAF/KMS/CloudTrail/GuardDuty/etc. suggest a regulated workload. These need a dedicated hardening + security review phase.',
        fix: 'Add a Hardening phase explicitly for security baseline + audit prep.',
      }));
    }

    // PLAN-WEEKEND-START-001 — start date on weekend
    if (startDate) {
      const d = new Date(startDate);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) {
        findings.push(finding({
          severity: 'low',
          ruleId: 'PLAN-WEEKEND-START-001',
          title: 'Project starts on a weekend',
          body: `${d.toDateString()} is a ${dow === 0 ? 'Sunday' : 'Saturday'}. Most clients can't kick off on weekends.`,
          fix: 'Shift to the next Monday.',
        }));
      }
    }

    return findings;
  },
};
