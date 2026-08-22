# AWS Career Launchpad Pro

An end-to-end platform for AWS career building — exam prep, project portfolio, freelance pipeline, and AWS account management — built as a single-page React app.

**Author:** David Gaisey-Otoo
**Repository:** https://github.com/DavidGaisey-Otoo/AWS-Career
**License:** MIT (see [LICENSE](./LICENSE))

---

## The headline feature — Solution Studio

**Paste a gig, get a buildable AWS solution.** One button on any gig in the
live feed (or any brief you paste) runs an eight-stage pipeline:

1. **Understand** — detects AWS services, region, compliance, budget, timeline
2. **Match** — ranks the brief against 8 proven architecture blueprints
3. **Name** — derives AWS-legal project, stack, bucket and repo names
4. **Approach** — recommends Console / CLI / Terraform / CloudFormation
5. **Generate** — emits reviewed project artifacts; CloudFormation coverage is
   reported service by service and unsupported resources block one-click deploy
6. **Review** — 10 specialist architect agents grade the design before you ship
7. **Build** — reviewed CloudFormation can be deployed from the browser only
   after the readiness and human-approval gates pass
8. **Tear down** — deletes the tracked CloudFormation stack and reports AWS API
   evidence; independently created resources remain the operator's responsibility

The deploy button reports its own honest coverage (which services it can and
can't provision), and the dashboard shows a permanent banner whenever a stack
is live in your account.

## What else it does

The app covers five integrated sections:

| Section | Features |
|---|---|
| 🏠 **Home** | Dashboard with daily study plan, income tracker, live-stack watch, getting-started checklist, recent activity, AI updates feed |
| 📚 **Learn** | Roadmap, Learning Lab, AI Study Assistant, Study Plan generator, AWS What's New, Resources, auto-generated Study Notes |
| 🎓 **Exam** | Exam Center (5 modes inc. Smart Review spaced repetition + Flashcards), Certifications hub, Interview prep, AI Interview Simulator |
| 🔨 **Build** | **Solution Studio**, Idea Studio, Project Builder, Portfolio, Architecture Studio, AWS Account Manager + Setup Documentation, Deploy Console, Project Walkthroughs, Session Log |
| 💰 **Earn** | Rate Calculator, Income Tracker, Job Analyzer, Freelance Hub (Live Gigs feed, Smart Proposal Generator, Win Rate Tracker, Email Outreach, CRM, Finance, Contracts, Branding), Career Coach, Market Intel, UK Transition Planner |

### Live gig sources

Six job boards, refreshed every 30 minutes:
RemoteOK, Remotive, Jobicy and Arbeitnow are fetched directly (they send
`Access-Control-Allow-Origin: *`); Himalayas and We Work Remotely go through a
CORS proxy chain. You can point the app at your own proxy — for example a
Cloudflare Worker — via `localStorage` key `awscl-pro::v1::gigfeed::proxy`.

## Tech stack

- React 18 + Vite + React Router
- Tailwind CSS + Framer Motion
- Context API for state management
- localStorage for persistence (all user data lives in the user's browser)
- AWS SDK v3 for the Deploy Console (CloudFormation browser deploys)
- html2pdf.js for PDF exports
- PWA support — install to home screen, works offline

## Running locally

```bash
git clone https://github.com/DavidGaisey-Otoo/AWS-Career.git
cd AWS-Career
npm install
npm run dev
```

Then open `http://localhost:5273`.

## Live demo

Deployed to GitHub Pages at: https://davidgaisey-otoo.github.io/AWS-Career/

## Testing

```bash
npm test
```

Nine suites, all pure functions — no network, no AWS, no browser needed:

- **Agent review** — 8 scenarios (PCI-DSS, HIPAA, IoT, ML, multi-region…) against the 10 architect agents
- **Solution pipeline** — 24 checks covering template validity, readiness gates,
  evidence integrity, YAML safety, AWS naming rules, and region routing
- **Sync secret-leak** — 8 checks proving credentials cannot reach remote sync
- **Custom projects** — 15 checks covering service selection, plans, naming and architecture consistency
- **Exam content** — 21 integrity, weighting, answer and mock-generation checks
- **Draw.io bridge** — 5 origin, XML-safety and graph-integrity checks
- **Deployment safety** — fail-closed executor and recursive audit-redaction checks
- **Business workflow** — draft, payment-evidence, acceptance and unresolved-marker checks
- **Generated artifacts** — mechanical safety gates for incomplete CLI, Terraform and CloudFormation output

`npm run build` is the production compilation gate. `npm audit
--audit-level=moderate` is used before release.

## Privacy & data

The main app is client-side and has no application database or analytics.
Notes, proposals, exam progress and business records start in this browser's
localStorage. When cross-device sync is enabled, a sanitized subset is copied
to an access-controlled private repository in the connected GitHub account.

**Credentials specifically:**

- AWS Account Manager identity-check keys are ephemeral and cleared after the
  request. Deploy Console can optionally store deployment credentials in an
  AES-GCM 256 vault (PBKDF2, 220k iterations) protected by the user's password.
- GitHub, Google and AWS credentials are **excluded from cross-device sync**,
  and synced values are deep-scrubbed for credential patterns. Legacy Gist data
  is sanitized, written to the private repository, read back and verified before
  the old Gist is removed.
- Generated proposals begin as drafts. The app does not submit marketplace
  applications. Invoice and payment features are recordkeeping only and do not
  connect to Stripe, Wise, PayPal, banks or payment webhooks.

## Production operator checklist

1. Connect the GitHub App in **Settings → Integrations** for private-repository sync.
2. Use temporary, least-privilege AWS credentials where possible. Review the
   generated CloudFormation and readiness disclosures before approval.
3. Deploy only through **Build → Deploy Console**. AWS Account Manager is a
   planning and identity-check surface, not a second deployment engine.
4. After delivery, collect client acceptance evidence, verify the tracked stack
   deletion in AWS, and check Cost Explorer/Budgets for independently created resources.
5. Treat generated plans, estimates and documents as drafts requiring professional
   and client review; no application can safely infer every unstated requirement.

The repository contains only the application code. Personal data is never committed.

## License

MIT — see [LICENSE](./LICENSE). You're free to fork, modify, and use the code, with attribution.

---

_Built as a portfolio piece for AWS Solutions Architect certification prep + freelance career launch._
