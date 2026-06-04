# AWS Career Launchpad Pro

An end-to-end platform for AWS career building — exam prep, project portfolio, freelance pipeline, and AWS account management — built as a single-page React app.

**Author:** David Gaisey-Otoo
**Repository:** https://github.com/DavidGaisey-Otoo/AWS-Career
**License:** MIT (see [LICENSE](./LICENSE))

---

## What it does

The app covers five integrated sections:

| Section | Features |
|---|---|
| 🏠 **Home** | Dashboard with daily study plan, income tracker, getting-started checklist, recent activity, AI updates feed |
| 📚 **Learn** | Roadmap, Learning Lab, AI Study Assistant, Study Plan generator, AWS What's New, Resources, auto-generated Study Notes |
| 🎓 **Exam** | Exam Center (5 modes inc. Smart Review spaced repetition + Flashcards), Certifications hub, Interview prep, AI Interview Simulator |
| 🔨 **Build** | Idea Studio, Project Builder, Portfolio, Architecture Studio, AWS Account Manager + Setup Documentation, Deploy Console, Project Walkthroughs, Session Log |
| 💰 **Earn** | Rate Calculator, Income Tracker, Job Analyzer, Freelance Hub (Live Gigs feed, Smart Proposal Generator, Win Rate Tracker, Email Outreach, CRM, Finance, Contracts, Branding), Career Coach, Market Intel, UK Transition Planner |

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

## Privacy & data

The app is a **pure client-side application**. No backend, no database, no analytics. All your data — notes, proposals, exam progress, AWS credentials, income entries — lives in **your browser's localStorage** and never leaves your device.

The repository contains only the application code. Personal data is never committed.

## License

MIT — see [LICENSE](./LICENSE). You're free to fork, modify, and use the code, with attribution.

---

_Built as a portfolio piece for AWS Solutions Architect certification prep + freelance career launch._
