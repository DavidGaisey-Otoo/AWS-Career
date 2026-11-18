/**
 * Navigation map: Home, Win work, Deliver.
 *
 * The app is for freelance AWS work. The study, exam and personal-tracking
 * pages were removed in November 2026; old bookmarks to them land on the
 * workspace. Adding a route: add it as a child of one of the three sections.
 */
import { Briefcase, BriefcaseBusiness, Calculator, Cloud, DollarSign, FileSearch, FileText, GanttChart, Hammer, Home, Inbox, Layers, Mail, PhoneCall, Presentation, Settings, Sparkles, TrendingUp, Wand2, Rocket, ListChecks } from 'lucide-react';
import { Github } from '../components/common/BrandIcons.jsx';

export const SECTIONS = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    path: '/',
    blurb: 'Every client job in one place, and the one-page flow for a new brief.',
    children: [
      { id: 'workspace', label: 'My Workspace', icon: Layers, path: '/',
        hint: 'Every job in one place — its solution, architecture, proposal, emails, documents, contract and invoice' },
      { id: 'start',     label: '🚀 Win this job', icon: Rocket, path: '/start',
        hint: 'Paste what the client sent you and work down one page: design, questions, proposal, email, deploy' },
      { id: 'settings',  label: 'Settings',       icon: Settings, path: '/settings' },
    ],
  },
  {
    id: 'earn',
    label: 'Win work',
    icon: BriefcaseBusiness,
    path: '/earn',
    blurb: 'Find gigs, price them, pitch them, and get paid.',
    children: [
      // ── Finding and pricing the work ──
      { id: 'freelance',      label: 'Freelance Hub',     icon: DollarSign, path: '/freelance',
        hint: 'Live gigs, proposals, client CRM, contracts, invoices and earnings' },
      { id: 'job-analyzer',   label: 'Job Analyzer',      icon: FileSearch, path: '/job-analyzer' },
      { id: 'rate-calc',      label: 'Rate Calculator',   icon: Calculator, path: '/rate-calculator' },
      { id: 'market',         label: 'Market Rates',      icon: TrendingUp, path: '/market',
        hint: 'What clients pay, which skills are in demand' },
      // ── Pitching and the paperwork a client receives ──
      { id: 'discovery-call', label: 'Discovery Call Prep', icon: PhoneCall,  path: '/discovery-call' },
      { id: 'project-plan',   label: 'Project Plan',      icon: GanttChart,   path: '/project-plan' },
      { id: 'presentation',   label: 'Client Presentation', icon: Presentation, path: '/presentation' },
      { id: 'email',          label: 'Client Emails',     icon: Mail,         path: '/email' },
      { id: 'documents',      label: 'Documents',         icon: FileText,     path: '/documents' },
      // ── Getting noticed ──
      { id: 'ai-coach',       label: 'AI Freelance Coach', icon: Sparkles,    path: '/ai/coach',
        hint: 'Profile review, proposal writer, pricing and negotiation drills' },
      { id: 'content-queue',  label: 'Content Queue',     icon: Inbox,        path: '/content-queue',
        hint: 'LinkedIn posts and GitHub pushes that bring clients to you' },
    ],
  },
  {
    id: 'build',
    label: 'Deliver',
    icon: Hammer,
    path: '/build',
    blurb: 'Design the solution, build it in AWS, and prove it in your portfolio.',
    children: [
      // ── Designing it ──
      { id: 'solution-studio', label: '⚡ Solution Studio', icon: Wand2,   path: '/solution',
        hint: 'Paste a gig → get the architecture, plan, code, review + a build button' },
      { id: 'architecture',   label: 'Architecture Studio', icon: Layers,   path: '/architecture' },
      { id: 'idea-studio',    label: 'Idea Studio',        icon: Sparkles, path: '/idea-studio' },
      { id: 'project-builder', label: 'Project Builder',   icon: Wand2,    path: '/project-builder' },
      // ── Building it in AWS ──
      { id: 'github-projects', label: 'Applications & Deploy', icon: Github, path: '/applications',
        hint: 'Choose a GitHub application, see the required AWS services, then follow Deploy → Verify → Destroy' },
      { id: 'aws-accounts',   label: 'AWS Account Manager', icon: Cloud,      path: '/aws-accounts' },
      { id: 'deploy',         label: 'Deploy Console',     icon: Rocket,     path: '/deploy' },
      { id: 'resource-search', label: 'Resource Search',   icon: FileSearch, path: '/resource-search',
        hint: 'Search your live AWS account read-only — what is running, what it costs, what is misconfigured' },
      { id: 'walkthroughs',   label: 'Project Walkthroughs', icon: ListChecks, path: '/walkthroughs' },
      { id: 'session-log',    label: 'Session Log',        icon: FileText,   path: '/session-log' },
      // ── Proving it ──
      { id: 'portfolio',      label: 'Portfolio',          icon: Briefcase,  path: '/portfolio' },
    ],
  },
];

// Quick lookup: path → { section, child } so breadcrumbs/back work everywhere.
const PATH_INDEX = (() => {
  const map = new Map();
  for (const sec of SECTIONS) {
    map.set(sec.path, { section: sec, child: null });
    for (const c of sec.children) {
      if (!map.has(c.path)) map.set(c.path, { section: sec, child: c });
    }
  }
  return map;
})();

/**
 * Resolve a pathname (including nested paths) to its breadcrumb chain.
 * `/portfolio/foo` → Build › Portfolio › foo
 */
export function breadcrumbsFor(pathname) {
  const chain = [];
  // First, try exact match
  const exact = PATH_INDEX.get(pathname);
  if (exact) {
    chain.push({ label: exact.section.label, to: exact.section.path });
    if (exact.child && exact.child.path !== exact.section.path) {
      chain.push({ label: exact.child.label, to: exact.child.path });
    }
    return chain;
  }

  // Walk up the path looking for the longest prefix match.
  const parts = pathname.split('/').filter(Boolean);
  for (let i = parts.length; i > 0; i--) {
    const candidate = '/' + parts.slice(0, i).join('/');
    const m = PATH_INDEX.get(candidate);
    if (m) {
      chain.push({ label: m.section.label, to: m.section.path });
      if (m.child && m.child.path !== m.section.path) {
        chain.push({ label: m.child.label, to: m.child.path });
      }
      // Add any deeper segments as plain labels
      for (let j = i; j < parts.length; j++) {
        chain.push({ label: prettifySegment(parts[j]), to: null });
      }
      return chain;
    }
  }

  // Fallback — at least show the path
  chain.push({ label: 'Home', to: '/' });
  for (const p of parts) chain.push({ label: prettifySegment(p), to: null });
  return chain;
}

function prettifySegment(seg) {
  return seg
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const MOBILE_NAV = SECTIONS.map((s) => ({
  id: s.id, label: s.label, icon: s.icon, path: s.path,
}));
