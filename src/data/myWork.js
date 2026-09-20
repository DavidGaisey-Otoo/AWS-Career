/**
 * myWork.js — the real work that exists as files, catalogued.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY THIS FILE EXISTS
 * ════════════════════════════════════════════════════════════════════
 * The workspace could only show what had been written into the app's
 * stores. The actual documents — the assessment dossier, the account
 * hardening report, the runbook, the evidence screenshots — live on disk
 * in documentation/ and evidence/ and were never recorded anywhere the
 * app could see. So opening a project showed one item and the question
 * "where are my documents?" had no answer.
 *
 * Every entry below describes a file that genuinely exists. Names, paths
 * and dates are taken from the files themselves. Nothing is summarised
 * beyond what the file name and its own heading state.
 *
 * ════════════════════════════════════════════════════════════════════
 * THE FILES ARE NOT IN THE REPOSITORY
 * ════════════════════════════════════════════════════════════════════
 * documentation/ and evidence/ are gitignored, because they contain an
 * AWS account ID and email addresses and this repository is public. These
 * records therefore point at a location on disk; they do not embed the
 * content. The workspace can tell you what you have and where it is, not
 * open it for you.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHERE A DOCUMENT BELONGS
 * ════════════════════════════════════════════════════════════════════
 * projectId is set only where it is clear from the document's own title
 * and date. Where it is genuinely ambiguous the field is left off and the
 * workspace lists the document as unassigned, which is the honest answer.
 */

/**
 * Projects that exist as a body of work rather than as a saved solution.
 * These anchor a container in the workspace the same way a case study does.
 */
export const MY_PROJECTS = [
  {
    id: 'aws-account-hardening-2026',
    title: 'AWS account setup and hardening',
    category: 'Work',
    completedAt: '2026-09-08',
    region: 'eu-west-1',
    services: ['IAM', 'AWS Budgets', 'Cost Anomaly Detection'],
    summary:
      'Set up an MFA-protected AWS account with an administrative IAM user, a monthly budget and cost anomaly detection, then captured the console evidence. Recorded as a 180-minute session on 23 May 2026; evidence collected through to 8 September 2026.',
  },
  {
    id: 'iam-security-assessment-2026',
    title: 'AWS Identity and Account Security Assessment',
    category: 'Work',
    completedAt: '2026-09-12',
    services: ['IAM'],
    summary:
      'An identity and account security assessment produced as a client-style dossier, with a separate private register of defects, limitations and retest evidence.',
  },
];

/**
 * The documents and evidence themselves.
 *
 * `localPath` is where the file is on disk. `kind: "evidence"` marks a
 * screenshot rather than a written document.
 */
export const MY_DOCUMENTS = [
  // ── The identity and account security assessment ──────────────────
  {
    id: 'iam-assessment-dossier',
    projectId: 'iam-security-assessment-2026',
    name: 'AWS Identity and Account Security Assessment',
    description:
      'Proposal, scope agreement, architecture, project plan, console runbook, test matrix, screenshot standard, findings form, AI verification and portfolio handover.',
    localPath: 'documentation\\David Gaisey-Otoo AWS Identity and Account Security Assessment.docx',
    createdAt: '2026-09-12',
    category: 'Work',
    // Deliberately not published with the site. The only copy is the one
    // on your disk, reached through the folder picker.
    status: 'Ready for evidence',
  },
  {
    id: 'iam-assessment-challenges',
    projectId: 'iam-security-assessment-2026',
    name: 'AWS Assessment Challenges and Improvements',
    description:
      'Private working register for defects, limitations, decisions, future improvements and retest evidence. Keep separate from the public portfolio.',
    localPath: 'documentation\\David Gaisey-Otoo AWS Assessment Challenges and Improvements.docx',
    createdAt: '2026-09-12',
    category: 'Personal',
    status: 'Private local register',
  },

  // ── Account setup and hardening ───────────────────────────────────
  {
    id: 'account-setup-master-report',
    projectId: 'aws-account-hardening-2026',
    name: 'AWS Account Setup Master Report',
    description:
      'Generated report covering the account snapshot, GitHub integration, the deploy audit log and the recorded hardening session.',
    localPath: 'documentation\\AWS Account Setup Master Report 2026-05-23.md',
    createdAt: '2026-05-23',
    category: 'Work',
    status: 'Complete',
    // A private record of your own account, not a deliverable. It carries
    // the account number, three email addresses and a note about which
    // bank cards were declined.
    internal: true,
    internalReason:
      'a record of your own AWS account — it contains the account number, personal email addresses and payment notes',
  },
  {
    id: 'account-setup-evidence',
    projectId: 'aws-account-hardening-2026',
    name: 'AWS Account Setup Evidence',
    description: 'The evidence pack for the account setup and hardening work.',
    localPath: 'evidence\\David_Gaisey-Otoo_AWS_Account_Setup_Evidence.docx',
    createdAt: '2026-09-08',
    category: 'Work',
    status: 'Complete',
  },
  {
    id: 'evidence-checklist',
    projectId: 'aws-account-hardening-2026',
    kind: 'evidence',
    name: 'Account checklist — screenshot',
    localPath: 'evidence\\launchpad-account-checklist.png',
    createdAt: '2026-09-02',
    category: 'Work',
  },
  {
    id: 'evidence-checklist-complete',
    projectId: 'aws-account-hardening-2026',
    kind: 'evidence',
    name: 'Account checklist complete — screenshot',
    localPath: 'evidence\\launchpad-account-checklist-complete.png',
    createdAt: '2026-09-07',
    category: 'Work',
  },
  {
    id: 'evidence-budgets',
    projectId: 'aws-account-hardening-2026',
    kind: 'evidence',
    name: 'Budgets overview — screenshot',
    localPath: 'evidence\\aws-budgets-overview.png',
    createdAt: '2026-09-02',
    category: 'Work',
  },
  {
    id: 'evidence-network-baseline',
    projectId: 'aws-account-hardening-2026',
    kind: 'evidence',
    name: 'Network baseline in CloudShell — screenshot',
    localPath: 'evidence\\aws-network-baseline-cloudshell.png',
    createdAt: '2026-09-07',
    category: 'Work',
  },

  // ── The static hosting work ───────────────────────────────────────
  {
    // Dated three days before the hosting case study was completed, and
    // covering the same S3 + CloudFront lifecycle. Move it if that is
    // wrong — it is the one placement here that is a judgement call.
    id: 'secure-static-website-runbook',
    projectId: 'aws-static-hosting-lifecycle-2026',
    name: 'Secure Static Website — AWS Practical Runbook',
    description: 'Practical console runbook for deploying a secure static website on AWS.',
    localPath: 'documentation\\Secure Static Website AWS Practical Runbook.docx',
    createdAt: '2026-09-09',
    category: 'Work',
    status: 'Complete',
  },

  // ── Study material, deliberately not filed under a project ────────
  {
    id: 'hands-on-practice-workbook',
    name: 'AWS Hands-On Practice Workbook',
    description: 'Practice workbook. Study material rather than a client deliverable, so it belongs to no project.',
    localPath: 'evidence\\David_Gaisey-Otoo_AWS_Hands_On_Practice_Workbook.docx',
    createdAt: '2026-09-08',
    category: 'Personal',
    status: 'Reference',
  },
];
