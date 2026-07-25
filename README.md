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
5. **Generate** — emits working Terraform, CloudFormation and CLI scripts
6. **Review** — 10 specialist architect agents grade the design before you ship
7. **Build** — one-click CloudFormation deploy straight from the browser
8. **Tear down** — one-click delete, so nothing is left billing

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

Three suites, all pure functions — no network, no AWS, no browser needed:

- **Agent review** — 8 scenarios (PCI-DSS, HIPAA, IoT, ML, multi-region…) against the 10 architect agents
- **Solution pipeline** — 21 checks covering template validity, YAML scalar safety, AWS naming rules, region routing, and that every field the UI renders is a primitive
- **Sync secret-leak** — 8 checks proving no credential can reach the sync gist

## Privacy & data

The app is a **pure client-side application**. No backend, no database, no analytics. All your data — notes, proposals, exam progress, AWS credentials, income entries — lives in **your browser's localStorage** and never leaves your device.

**Credentials specifically:**

- AWS keys used for deploys are held in memory for the duration of a single call and are never persisted. If you opt into saving them, they go through an AES-GCM 256 vault (PBKDF2, 220k iterations) that is useless without your password.
- The GitHub PAT and Google OAuth secrets are **excluded from cross-device sync**, and every synced value is deep-scrubbed for credential patterns before upload. If the app detects a gist created by an older version, it offers one-click remediation (delete the gist, wiping its revision history, and recreate it clean).

The repository contains only the application code. Personal data is never committed.

## License

MIT — see [LICENSE](./LICENSE). You're free to fork, modify, and use the code, with attribution.

---

_Built as a portfolio piece for AWS Solutions Architect certification prep + freelance career launch._
