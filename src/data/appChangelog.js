/**
 * appChangelog.js — manually-curated history of what's shipped in the app.
 *
 * Add a new entry at the TOP whenever a meaningful change ships. The
 * Updates page reads from here.
 *
 * Each entry:
 *   id        — kebab-case unique
 *   version   — semver-ish (we're informal: bump minor when a feature ships,
 *               patch when content is rewritten, major if we redesign)
 *   date      — YYYY-MM-DD
 *   highlight — one-line punchline
 *   sections  — { added?, changed?, fixed?, notes? } arrays of bullets
 *   docsUrl   — optional internal /walkthrough or external link
 */

export const APP_CHANGELOG = [
  {
    id: '2026-05-23-deploy-console-and-step-by-step',
    version: '1.7.0',
    date: '2026-05-23',
    highlight: 'Strict-approval Deploy Console + step-by-step Roadmap + live "Check my work" verification + auto-clickable URLs.',
    sections: {
      added: [
        'Deploy Console (/deploy) — encrypted AWS credentials vault with AES-GCM 256, five action-tier permission gates, immutable audit log, panic killswitch (Ctrl/⌘+Shift+K).',
        'Walkthroughs (/walkthroughs) — atomic step-by-step procedures with progress tracking, direct AWS Console URLs, checkpoints.',
        'Session Log (/session-log) — tonight\'s AWS setup auto-documented; export as Markdown / PDF.',
        'Project Builder (/project-builder) — 8-step wizard with smart name suggestions for buckets, repos, IAM roles, Lambdas, etc.',
        'Roadmap study notes — Next/Prev navigation, "Mark done & next ▶", per-step progress, expand-all toggle.',
        '"Check my work" buttons — uses your linked AWS account to verify each step actually worked (S3 bucket exists? Versioning on? MFA enabled?).',
        'Combined end-to-end scripts panel — full CLI / Terraform / CloudFormation bundles for every walkthrough, downloadable.',
        'Auto-clickable URLs in step text — no more copy-pasting links.',
        '"Console UI verified" freshness badges — shows when walkthrough last matched current AWS UI.',
        'Updates page (this one!) — app changelog + live AWS What\'s New + how-to-update.',
      ],
      changed: [
        'Atomic micro-step format for S3, MFA, and AWS account walkthroughs — each step is one click, one field.',
        'SmartMethodDetector ConsoleTab — one step at a time by default, progress survives reload.',
        'AWS Account Manager — multi-profile support, color coding, Gmail user index, tier detection.',
      ],
      fixed: [
        'Roadmap walkthroughs were "sentence form" — now break each step into vertical micro-actions with connector lines.',
      ],
    },
  },
  {
    id: '2026-05-22-content-queue',
    version: '1.6.0',
    date: '2026-05-22',
    highlight: 'Content Queue (stage LinkedIn posts to publish later) + AWS Free Tier auto-detection.',
    sections: {
      added: [
        'Content Queue (/content-queue) — stage LinkedIn posts from completed projects or topic ideas.',
        'AWS Free Tier auto-detection via IAM ListUsers heuristic.',
        'Multi-profile AWS Account Manager with color coding and Gmail linking.',
        'GitHub PAT integration — push portfolio repos directly from the Project Detail view.',
      ],
    },
  },
  {
    id: '2026-05-21-project-plan-generator',
    version: '1.5.0',
    date: '2026-05-21',
    highlight: 'Project Plan Generator + 14-question Discovery Call Prep + Job Analyzer cross-page autofill.',
    sections: {
      added: [
        'Project Plan Generator (/project-plan) — Gantt-style timelines, editable phases, payment schedules, risk register, PDF/Markdown export.',
        'Discovery Call Prep — 14 project-type questions, auto-fills Project Plan + Presentation Generator.',
        'Job Analyzer — extracts project name + client company from a pasted job listing.',
        'Getting Started widget on Dashboard.',
      ],
      fixed: [
        'EarnContext schema-migration crash when loading older localStorage.',
      ],
    },
  },
  {
    id: '2026-05-20-step-guide-rebuild',
    version: '1.4.0',
    date: '2026-05-20',
    highlight: 'Full study notes on every roadmap task — 4 method tabs, generic fallback for any service.',
    sections: {
      added: [
        'Rich study notes attached to every roadmap task with Console / CLI / Terraform / CloudFormation tabs.',
        'Generic study guide fallback so every task gets content (no more "no guide" empty states).',
        'Account-aware callouts — knows which AWS profile commands will hit.',
        'Prev/Next task navigation in roadmap detail view.',
      ],
      fixed: [
        'Exam Center: 65-question exam was loading only 20 questions.',
      ],
    },
  },
  {
    id: '2026-05-15-stages-1-14',
    version: '1.0.0',
    date: '2026-05-15',
    highlight: 'Initial v1 — 5-section nav, AWS Account Manager, AI hub, Freelance hub, Gamification, Community, Wellness, UK Planner.',
    sections: {
      added: [
        '5-section navigation (Home / Learn / Exam / Build / Earn).',
        'AWS Account Manager — credentials, dual profile, deployments, auto-destroy.',
        'AI hub: Study Assistant, Career Coach (10 tools), Study Plan Generator, Interview Simulator.',
        'Freelance hub: Proposals, CRM, Financial Command Center, Contracts, Personal Branding, Market Intel.',
        'Gamification — XP, levels, badges, leaderboard, streaks.',
        'Community, Wellness, UK Transition Planner.',
        'Exam Center — 5 modes (adaptive, study, mock, etc.), 13 certifications.',
        'What\'s New in AWS feed page.',
      ],
    },
  },
];

/** Pull the latest entry for "you're on version X" displays. */
export function currentVersion() {
  return APP_CHANGELOG[0]?.version || '0.0.0';
}

export function latestEntry() {
  return APP_CHANGELOG[0] || null;
}
