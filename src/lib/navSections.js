/**
 * 5-section navigation map.
 *
 * Every existing route is kept addressable directly; this file just groups
 * the routes into five parent sections for sidebar + breadcrumb logic.
 *
 * Adding a new route: add it to BOTH the legacy NAV_ITEMS (for backwards
 * compatibility with code that still reads it) AND a child under one of
 * the five sections below.
 */
import {
  Activity, Award, BarChart3, BookOpen, Brain, Briefcase, BriefcaseBusiness,
  Calculator, Calendar, Cloud, DollarSign, FileSearch, FileText, FlaskConical, GanttChart,
  GraduationCap, Hammer, Heart, Home, Inbox, Layers, Library, Mail, Map as MapIcon,
  Newspaper, PhoneCall, Plane, Presentation, Settings, Sparkles, Target,
  TrendingUp, Trophy, Users, Wand2, Mic, ShieldCheck, Rocket, ListChecks,
} from 'lucide-react';

export const SECTIONS = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    path: '/',
    blurb: 'Your live progress, focus for today, and recent activity.',
    children: [
      { id: 'dashboard', label: 'Dashboard',         icon: Home,       path: '/' },
      { id: 'profile',   label: 'Profile + Badges',  icon: Trophy,     path: '/profile' },
      { id: 'community', label: 'Community',         icon: Users,      path: '/community' },
      { id: 'wellness',  label: 'Wellness',          icon: Heart,      path: '/wellness' },
      { id: 'analytics', label: 'Analytics',         icon: BarChart3,  path: '/analytics' },
      { id: 'readiness', label: 'Readiness check',   icon: ShieldCheck,path: '/readiness' },
      { id: 'updates',   label: 'Updates',           icon: Sparkles,   path: '/updates' },
      { id: 'settings',  label: 'Settings',          icon: Settings,   path: '/settings' },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    icon: BookOpen,
    path: '/learn',
    blurb: 'The full AWS curriculum + study tools + AI tutor.',
    children: [
      { id: 'roadmap',     label: 'My Roadmap',        icon: MapIcon,     path: '/roadmap' },
      { id: 'learning',    label: 'Learning Lab',      icon: BookOpen,    path: '/learning' },
      { id: 'ai',          label: 'AI hub',            icon: Brain,       path: '/ai' },
      { id: 'ai-assistant',label: 'AI Study Assistant',icon: Brain,       path: '/ai/assistant' },
      { id: 'study-plan',  label: 'Study plan',        icon: Calendar,    path: '/ai/study-plan' },
      { id: 'aws-updates', label: 'What\'s New in AWS',icon: Newspaper,   path: '/aws-updates' },
      { id: 'resources',   label: 'Resources',         icon: Library,     path: '/resources' },
    ],
  },
  {
    id: 'exam',
    label: 'Exam',
    icon: GraduationCap,
    path: '/exam-hub',
    blurb: 'All 13 AWS certifications — mocks, practice, learning mode.',
    children: [
      { id: 'exam',         label: 'Exam Center',       icon: GraduationCap, path: '/exam' },
      { id: 'certs',        label: 'Certifications',    icon: Award,         path: '/certifications' },
      { id: 'interview',    label: 'Interview prep',    icon: Mic,           path: '/interview' },
      { id: 'ai-interview', label: 'Interview sim (AI)',icon: Wand2,         path: '/ai/interview' },
    ],
  },
  {
    id: 'build',
    label: 'Build',
    icon: Hammer,
    path: '/build',
    blurb: 'Portfolio projects + architecture studio + AWS account deploys.',
    children: [
      { id: 'idea-studio',  label: 'Idea Studio',          icon: Sparkles,    path: '/idea-studio' },
      { id: 'project-builder', label: 'Project Builder',  icon: Wand2,       path: '/project-builder' },
      { id: 'portfolio',    label: 'Portfolio',           icon: Briefcase,   path: '/portfolio' },
      { id: 'architecture', label: 'Architecture Studio', icon: Layers,      path: '/architecture' },
      { id: 'aws-accounts', label: 'AWS Account Manager', icon: Cloud,       path: '/aws-accounts' },
      { id: 'deploy',       label: 'Deploy Console',      icon: Rocket,      path: '/deploy' },
      { id: 'walkthroughs', label: 'Walkthroughs',        icon: ListChecks,  path: '/walkthroughs' },
      { id: 'session-log',  label: 'Session Log',         icon: FileText,    path: '/session-log' },
    ],
  },
  {
    id: 'earn',
    label: 'Earn',
    icon: BriefcaseBusiness,
    path: '/earn',
    blurb: 'Land paid AWS work — proposals, CRM, finance, contracts, market intel.',
    children: [
      { id: 'rate-calc',      label: 'Rate Calculator',       icon: Calculator,   path: '/rate-calculator' },
      { id: 'job-analyzer',   label: 'Job Analyzer',          icon: FileSearch,   path: '/job-analyzer' },
      { id: 'discovery-call', label: 'Discovery Call Prep',   icon: PhoneCall,    path: '/discovery-call' },
      { id: 'project-plan',   label: 'Project Plan',          icon: GanttChart,   path: '/project-plan' },
      { id: 'presentation',   label: 'Presentation Generator',icon: Presentation, path: '/presentation' },
      { id: 'email',          label: 'Email System',          icon: Mail,         path: '/email' },
      { id: 'documents',      label: 'Document Center',       icon: FileText,     path: '/documents' },
      { id: 'content-queue',  label: 'Content Queue',         icon: Inbox,        path: '/content-queue' },
      { id: 'freelance',      label: 'Freelance Hub',         icon: DollarSign,   path: '/freelance' },
      { id: 'ai-coach',       label: 'AI Career Coach',       icon: Sparkles,     path: '/ai/coach' },
      { id: 'market',         label: 'Market Intel',          icon: TrendingUp,   path: '/market' },
      { id: 'uk',             label: 'UK Transition Planner', icon: Plane,        path: '/uk' },
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

export const MOBILE_NAV_5 = SECTIONS.map((s) => ({
  id: s.id, label: s.label, icon: s.icon, path: s.path,
}));
