import {
  Home, Map, Briefcase, BookOpen, GraduationCap, Award, Brain,
  DollarSign, FileSearch, FileText, GanttChart, Mail, Newspaper, PhoneCall,
  Presentation, TrendingUp, Mic, Layers, Users, Library, BarChart3, Settings,
  Trophy, Heart, Plane,
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',           icon: Home,           path: '/' },
  { id: 'roadmap',      label: 'My Roadmap',          icon: Map,            path: '/roadmap' },
  { id: 'portfolio',    label: 'Portfolio',           icon: Briefcase,      path: '/portfolio' },
  { id: 'learning',     label: 'Learning Lab',        icon: BookOpen,       path: '/learning' },
  { id: 'exam',         label: 'Exam Center',         icon: GraduationCap,  path: '/exam' },
  { id: 'certs',        label: 'Certifications',      icon: Award,          path: '/certifications' },
  { id: 'ai',           label: 'AI Assistant',        icon: Brain,          path: '/ai' },
  { id: 'aws-updates',  label: 'What\'s New in AWS',  icon: Newspaper,      path: '/aws-updates' },
  { id: 'job-analyzer', label: 'Job Analyzer',        icon: FileSearch,     path: '/job-analyzer' },
  { id: 'discovery-call', label: 'Discovery Call Prep', icon: PhoneCall,    path: '/discovery-call' },
  { id: 'project-plan', label: 'Project Plan',        icon: GanttChart,     path: '/project-plan' },
  { id: 'presentation', label: 'Presentation',        icon: Presentation,   path: '/presentation' },
  { id: 'email',        label: 'Email System',        icon: Mail,           path: '/email' },
  { id: 'documents',    label: 'Document Center',     icon: FileText,       path: '/documents' },
  { id: 'freelance',    label: 'Freelance Hub',       icon: DollarSign,     path: '/freelance' },
  { id: 'market',       label: 'Market Intel',        icon: TrendingUp,     path: '/market' },
  { id: 'interview',    label: 'Interview Prep',      icon: Mic,            path: '/interview' },
  { id: 'architecture', label: 'Architecture Studio', icon: Layers,         path: '/architecture' },
  { id: 'community',    label: 'Community',           icon: Users,          path: '/community' },
  { id: 'profile',      label: 'Profile + Badges',    icon: Trophy,         path: '/profile' },
  { id: 'wellness',     label: 'Wellness',            icon: Heart,          path: '/wellness' },
  { id: 'uk',           label: 'UK Planner',          icon: Plane,          path: '/uk' },
  { id: 'resources',    label: 'Resources',           icon: Library,        path: '/resources' },
  { id: 'analytics',    label: 'Analytics',           icon: BarChart3,      path: '/analytics' },
  { id: 'settings',     label: 'Settings',            icon: Settings,       path: '/settings' },
];

export const MOBILE_NAV_ITEMS = [
  NAV_ITEMS[0],   // Dashboard
  NAV_ITEMS[1],   // Roadmap
  NAV_ITEMS[3],   // Learning
  NAV_ITEMS[19],  // Profile (gamification)
  NAV_ITEMS[18],  // Community
];

export const AWS_LEVELS = [
  { id: 'beginner',     label: 'Complete Beginner',  blurb: 'Brand new to AWS or cloud computing.' },
  { id: 'practitioner', label: 'Cloud Practitioner', blurb: 'Foundational understanding of AWS services.' },
  { id: 'associate',    label: 'Associate Level',    blurb: 'Comfortable with core services and architecture.' },
  { id: 'professional', label: 'Professional Level', blurb: 'Designing advanced, multi-account workloads.' },
];

export const GOALS = [
  { id: 'freelance',    label: 'Freelancing',          blurb: 'Earn income building cloud solutions.' },
  { id: 'uk-job',       label: 'UK Job',               blurb: 'Land a salaried cloud role in the UK.' },
  { id: 'certification',label: 'AWS Certification',    blurb: 'Pass official AWS exams.' },
  { id: 'all',          label: 'All of the above',     blurb: 'Maximum velocity, every track.' },
];

export const HOURS_OPTIONS = [
  { id: '1-2', label: '1–2 hours' },
  { id: '3-4', label: '3–4 hours' },
  { id: '5-6', label: '5–6 hours' },
  { id: '6+',  label: '6+ hours'  },
];

export const APP_NAME = 'AWS Career Launchpad Pro';
export const STORAGE_KEY = 'awscl-pro::v1';
