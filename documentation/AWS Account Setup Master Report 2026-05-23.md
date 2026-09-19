# AWS Career Launchpad — Master Setup Report

**Generated:** 2026-05-23T21:43:08.400Z
**Owner:** gaiseyotood@gmail.com

## 1 · Account snapshot

- **AWS account:** 851725590283 (My Free Tier Account)
- **Region:** eu-west-1
- **Connected:** ✅
- **Effective tier:** free — Detected — account is 0 days old, 365 days left in 12-month Free Tier.
- **Vault initialised:** ❌

## 2 · GitHub integration

- **Token saved:** ✅ on 2026-05-23T21:22:56.406Z
- **User:** DavidGaisey-Otoo
- **Expiry:** not recorded  · Expiry date not set

## 3 · Deploy audit log (most recent 25)

_No deploy actions logged yet._

## 4 · Recorded sessions

### AWS account setup — complete hardening

# AWS account setup — complete hardening

**Date:** 2026-05-23
**Duration:** 180 minutes
**Account:** 851725590283 (Gaisey) — gaiseyotood@gmail.com
**Region:** eu-west-1

## Summary

Set up a working, MFA-protected AWS account with cost alerts and ML anomaly detection. Used existing account (851725590283) after new-account payment retries hit the AWS rate limit. Created IAM user "David" with admin power, MFA on both root and IAM user, $5 monthly budget, and confirmed AWS auto-enabled Cost Anomaly Detection.

## ⚠ Notes & warnings

> New account creation attempted but blocked by AWS payment retry limit (24-hour cooldown). Existing account is more than 1 year old — past the 12-month Free Tier window. Treat every action as PAID and monitor the $5 budget closely.

> Two Ghanaian CBG virtual cards (₵20 + ₵50) were rejected at the AWS payment screen. For future new-account attempts: use a Wise virtual card, a UK debit card, or a physical Visa/Mastercard.

## What now exists

- ✅ **Root account exists and verified** — Pre-existing account, signed in successfully
- ✅ **MFA on root account** — Authenticator app, scanned QR, 2 consecutive codes
- ✅ **IAM user "David" with AdministratorAccess** — Console access enabled, password set
- ✅ **MFA on IAM user David**
- ✅ **Account alias / friendly sign-in URL**
- ✅ **Default region set to eu-west-1**
- ✅ **Account linked to AWS Career Launchpad Pro** — Active profile in AWS Account Manager
- ✅ **$5 monthly budget with email alert** — Budget name: monthly-5-dollar-limit, alert at 80%, to gaiseyotood@gmail.com
- ✅ **AWS Cost Anomaly Detection** — Auto-enabled by AWS (free ML watchdog)
- ✅ **Payment method attached** — On existing account; new-account attempts failed (CBG virtual cards rejected)
- ✅ **Support plan selected** — Basic (Free)

## Step-by-step record

### Step 1 — Confirmed existing AWS account access

> _Phase: Foundation · 8 min_

🔗 **Direct URL:** [https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fconsole.aws.amazon.com&account_type=root](https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fconsole.aws.amazon.com&account_type=root)

Signed in as ROOT with gaiseyotood@gmail.com after one wrong-email mis-type (dgaiseyotoo@gmail.com → AWS account does not exist).

✓ **Checkpoint:** Root console loaded successfully.

---

### Step 2 — Enabled MFA on the root user

> _Phase: Foundation · 5 min_

🔗 **Direct URL:** [https://us-east-1.console.aws.amazon.com/iam/home#/security_credentials](https://us-east-1.console.aws.amazon.com/iam/home#/security_credentials)

IAM → Security credentials → Multi-factor authentication → Assign MFA device → Authenticator app → scanned QR code → entered two consecutive 6-digit codes.

✓ **Checkpoint:** Root account now requires MFA at every sign-in.

---

### Step 3 — Created IAM user "David" with AdministratorAccess

> _Phase: IAM · 6 min_

🔗 **Direct URL:** [https://us-east-1.console.aws.amazon.com/iam/home#/users](https://us-east-1.console.aws.amazon.com/iam/home#/users)

IAM → Users → Create user. Username: David. Console access enabled. Custom password set. Attached managed policy: AdministratorAccess.

✓ **Checkpoint:** User David created, .csv credentials downloaded and saved.

---

### Step 4 — Enabled MFA on IAM user David

> _Phase: IAM · 4 min_

🔗 **Direct URL:** [https://us-east-1.console.aws.amazon.com/iamv2/home#/users/details/David?section=security_credentials](https://us-east-1.console.aws.amazon.com/iamv2/home#/users/details/David?section=security_credentials)

Signed in as David → top-right username → Security credentials → MFA → Assign. Same authenticator app, new entry. Two consecutive codes.

✓ **Checkpoint:** David now requires MFA at every sign-in.

---

### Step 5 — Set default region to EU (Ireland) — eu-west-1

> _Phase: Region · 2 min_

Top-right region picker → EU (Ireland) eu-west-1. AWS persists this choice per browser session.

💡 **Tip:** eu-west-1 was chosen for low latency from Ghana + strong service availability + GDPR alignment.

✓ **Checkpoint:** Region indicator in the console reads "Ireland".

---

### Step 6 — Linked account to AWS Career Launchpad Pro

> _Phase: Integration · 4 min_

🔗 **Direct URL:** [/aws-accounts](/aws-accounts)

In-app: AWS Account Manager → active profile → entered David's access key ID + secret access key → Save → Test connection.

✓ **Checkpoint:** STS GetCallerIdentity succeeded; profile shows Connected ✓ + account ID 851725590283.

---

### Step 7 — Created $5 monthly budget

> _Phase: Cost protection · 6 min_

🔗 **Direct URL:** [https://console.aws.amazon.com/billing/home#/budgets](https://console.aws.amazon.com/billing/home#/budgets)

Billing → Budgets → Create budget → Use template → Monthly cost budget. Name: monthly-5-dollar-limit. Amount: $5 USD. Email: gaiseyotood@gmail.com. Alert at 80%.

✓ **Checkpoint:** Green confirmation: "monthly-5-dollar-limit has been created successfully".

---

### Step 8 — Confirmed AWS auto-enabled Cost Anomaly Detection

> _Phase: Cost protection · 2 min_

🔗 **Direct URL:** [https://console.aws.amazon.com/cost-management/home#/anomaly-detection](https://console.aws.amazon.com/cost-management/home#/anomaly-detection)

Email from anomalydetection@costalerts.amazonaws.com confirmed AWS pre-configured Cost Anomaly Detection (free service, ML-based, alerts on > $100 AND > 40% expected spend).

💡 **Tip:** Complements the $5 budget — budget catches sustained overspend, anomaly detection catches sudden spikes.

✓ **Checkpoint:** Service active, daily summary subscribed.

---

## Next steps

- Start Project 1 — S3 static website + CloudFront (see walkthrough: project-s3-static-site).
- Consider creating a dedicated "app-deployer" IAM user with PowerUserAccess + a custom DENY policy for the most dangerous actions (separate from David). The Deploy Console walks you through that.
- Optional: enable CloudTrail for full API audit logging (free for the first trail).
- Optional: enable IAM Access Analyzer for least-privilege policy hints.

---

_Generated by AWS Career Launchpad Pro on 2026-05-23T21:43:08.400Z._

---

## 5 · App changelog

### v1.7.0 · 2026-05-23
Strict-approval Deploy Console + step-by-step Roadmap + live "Check my work" verification + auto-clickable URLs.

**Added**
- Deploy Console (/deploy) — encrypted AWS credentials vault with AES-GCM 256, five action-tier permission gates, immutable audit log, panic killswitch (Ctrl/⌘+Shift+K).
- Walkthroughs (/walkthroughs) — atomic step-by-step procedures with progress tracking, direct AWS Console URLs, checkpoints.
- Session Log (/session-log) — tonight's AWS setup auto-documented; export as Markdown / PDF.
- Project Builder (/project-builder) — 8-step wizard with smart name suggestions for buckets, repos, IAM roles, Lambdas, etc.
- Roadmap study notes — Next/Prev navigation, "Mark done & next ▶", per-step progress, expand-all toggle.
- "Check my work" buttons — uses your linked AWS account to verify each step actually worked (S3 bucket exists? Versioning on? MFA enabled?).
- Combined end-to-end scripts panel — full CLI / Terraform / CloudFormation bundles for every walkthrough, downloadable.
- Auto-clickable URLs in step text — no more copy-pasting links.
- "Console UI verified" freshness badges — shows when walkthrough last matched current AWS UI.
- Updates page (this one!) — app changelog + live AWS What's New + how-to-update.

**Changed**
- Atomic micro-step format for S3, MFA, and AWS account walkthroughs — each step is one click, one field.
- SmartMethodDetector ConsoleTab — one step at a time by default, progress survives reload.
- AWS Account Manager — multi-profile support, color coding, Gmail user index, tier detection.

**Fixed**
- Roadmap walkthroughs were "sentence form" — now break each step into vertical micro-actions with connector lines.

### v1.6.0 · 2026-05-22
Content Queue (stage LinkedIn posts to publish later) + AWS Free Tier auto-detection.

**Added**
- Content Queue (/content-queue) — stage LinkedIn posts from completed projects or topic ideas.
- AWS Free Tier auto-detection via IAM ListUsers heuristic.
- Multi-profile AWS Account Manager with color coding and Gmail linking.
- GitHub PAT integration — push portfolio repos directly from the Project Detail view.

### v1.5.0 · 2026-05-21
Project Plan Generator + 14-question Discovery Call Prep + Job Analyzer cross-page autofill.

**Added**
- Project Plan Generator (/project-plan) — Gantt-style timelines, editable phases, payment schedules, risk register, PDF/Markdown export.
- Discovery Call Prep — 14 project-type questions, auto-fills Project Plan + Presentation Generator.
- Job Analyzer — extracts project name + client company from a pasted job listing.
- Getting Started widget on Dashboard.

**Fixed**
- EarnContext schema-migration crash when loading older localStorage.

### v1.4.0 · 2026-05-20
Full study notes on every roadmap task — 4 method tabs, generic fallback for any service.

**Added**
- Rich study notes attached to every roadmap task with Console / CLI / Terraform / CloudFormation tabs.
- Generic study guide fallback so every task gets content (no more "no guide" empty states).
- Account-aware callouts — knows which AWS profile commands will hit.
- Prev/Next task navigation in roadmap detail view.

**Fixed**
- Exam Center: 65-question exam was loading only 20 questions.

### v1.0.0 · 2026-05-15
Initial v1 — 5-section nav, AWS Account Manager, AI hub, Freelance hub, Gamification, Community, Wellness, UK Planner.

**Added**
- 5-section navigation (Home / Learn / Exam / Build / Earn).
- AWS Account Manager — credentials, dual profile, deployments, auto-destroy.
- AI hub: Study Assistant, Career Coach (10 tools), Study Plan Generator, Interview Simulator.
- Freelance hub: Proposals, CRM, Financial Command Center, Contracts, Personal Branding, Market Intel.
- Gamification — XP, levels, badges, leaderboard, streaks.
- Community, Wellness, UK Transition Planner.
- Exam Center — 5 modes (adaptive, study, mock, etc.), 13 certifications.
- What's New in AWS feed page.

## 6 · Walkthrough progress

- **project-s3-static-site** — 0/? steps complete
- **p1-t6** — 0/? steps complete
- **iam-user-create** — 0/? steps complete
- **p2-t1** — 0/? steps complete
- **p1-t4** — 0/? steps complete
- **p1-t5** — 0/? steps complete
- **p1-t2** — 0/? steps complete
- **mfa-iam-user** — 0/? steps complete
- **__transient** — 0/? steps complete
- **mfa-root** — 0/? steps complete
- **p8-t1** — 0/? steps complete
- **iam-billing-access** — 0/? steps complete
- **aws-account-create** — 0/? steps complete
- **budget-create** — 0/? steps complete

---
_End of report._