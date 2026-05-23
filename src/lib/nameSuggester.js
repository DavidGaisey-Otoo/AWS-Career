/**
 * nameSuggester.js — generates sensible names for the things the user
 * is naming over and over (projects, buckets, repos, branches, files…).
 *
 * Goal: the user should NEVER have to think about a name. Click "Suggest"
 * and get something that:
 *   • Respects the platform's naming rules (S3 buckets: lowercase + dots/hyphens; etc.)
 *   • Sounds personal (uses their first name if available)
 *   • Is unique enough to avoid collisions (date stamp or hash)
 *   • Is short enough to type
 *
 * Public API:
 *   suggestName(kind, hint, context) → string
 *   where kind = one of NAME_KINDS keys
 *         hint = optional user-provided seed (e.g. "blog", "demo")
 *         context = the current wizard `values` blob (uses firstName, projectType, etc.)
 *
 * Adding a kind: append to NAME_KINDS with a generate() function.
 */

import { uid } from './utils.js';

// ---------------- shared helpers ----------------

function getFirstName(ctx) {
  return (
    ctx?.firstName ||
    ctx?.fullName?.split(/\s+/)[0] ||
    ctx?.name?.split(/\s+/)[0] ||
    'me'
  ).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function shortDate() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function slugify(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function shortId() {
  return uid().slice(0, 6);
}

// ---------------- per-kind generators ----------------

export const NAME_KINDS = {
  // ─── AWS S3 ───
  's3-bucket': {
    label: 'S3 bucket name',
    rules: 'Lowercase letters, digits, dots and hyphens. 3–63 chars. Globally unique.',
    examples: ['david-portfolio-2026', 'kofi-blog-prod-2026', 'me-static-demo'],
    generate(hint, ctx) {
      const me = getFirstName(ctx);
      const seed = slugify(hint || ctx.projectType || ctx.projectName || 'portfolio');
      const date = shortDate().slice(2); // YYMMDD
      return `${me}-${seed}-${date}`.slice(0, 63);
    },
  },

  's3-bucket-portfolio': {
    label: 'Portfolio S3 bucket',
    rules: 'Lowercase, hyphens, globally unique. Suitable for a public static site.',
    examples: ['david-portfolio-2026', 'davidgaisey-www-2026'],
    generate(hint, ctx) {
      const me = getFirstName(ctx);
      return slugify(`${me}-${hint || 'portfolio'}-${new Date().getFullYear()}`).slice(0, 63);
    },
  },

  // ─── EC2 ───
  'ec2-instance': {
    label: 'EC2 instance name tag',
    rules: 'Free-form — used as the Name tag in EC2.',
    examples: ['david-blog-web-1', 'staging-api-eu1'],
    generate(hint, ctx) {
      const me = getFirstName(ctx);
      const seed = slugify(hint || ctx.projectName || 'web');
      return `${me}-${seed}-1`;
    },
  },

  // ─── Lambda ───
  'lambda-fn': {
    label: 'Lambda function name',
    rules: 'Letters, digits, hyphens, underscores. Up to 64 chars.',
    examples: ['DavidContactForm', 'kofi-image-resize', 'OrderProcessor'],
    generate(hint, ctx) {
      const me = getFirstName(ctx);
      const seed = slugify(hint || ctx.projectName || 'handler');
      return `${me}-${seed}-fn`;
    },
  },

  // ─── DynamoDB ───
  'dynamodb-table': {
    label: 'DynamoDB table name',
    rules: 'Letters, digits, dot, underscore, hyphen. 3–255 chars. Unique per region.',
    examples: ['david-contacts', 'orders-2026', 'kofi-blog-posts'],
    generate(hint, ctx) {
      const me = getFirstName(ctx);
      const seed = slugify(hint || ctx.projectName || 'data');
      return `${me}-${seed}`;
    },
  },

  // ─── IAM ───
  'iam-role': {
    label: 'IAM role name',
    rules: 'Letters, digits, _+=,.@- only. Up to 64 chars. Unique per account.',
    examples: ['DavidLambdaExecutionRole', 'BlogApiRole-2026'],
    generate(hint, ctx) {
      const seed = slugify(hint || ctx.projectName || 'app');
      const PascalSeed = seed.split('-').map((s) => s[0]?.toUpperCase() + s.slice(1)).join('');
      const me = getFirstName(ctx);
      const Me = me[0]?.toUpperCase() + me.slice(1);
      return `${Me}${PascalSeed}Role`;
    },
  },

  // ─── Project naming ───
  'project-name': {
    label: 'Project name (display)',
    rules: 'Free-form, human-readable, used as the portfolio title.',
    examples: ['David — Personal Portfolio (2026)', 'Kofi Blog · Static + CloudFront', 'Lambda Contact Form'],
    generate(hint, ctx) {
      const me = getFirstName(ctx);
      const Me = me[0]?.toUpperCase() + me.slice(1);
      const types = {
        'static-site':   'Personal Portfolio',
        'static':        'Static Website',
        'blog':          'Blog (Static + CloudFront)',
        'api':           'REST API (Lambda + API Gateway)',
        'serverless':    'Serverless App',
        'ecommerce':     'E-commerce Storefront',
        'dashboard':     'Analytics Dashboard',
      };
      const t = types[ctx.projectType] || types[hint] || (hint ? capWords(hint) : 'AWS Project');
      return `${Me} — ${t} (${new Date().getFullYear()})`;
    },
  },

  // ─── GitHub repo ───
  'github-repo': {
    label: 'GitHub repository name',
    rules: 'Lowercase, hyphens. Unique within your account.',
    examples: ['david-portfolio', 'kofi-blog-2026', 'lambda-contact-form'],
    generate(hint, ctx) {
      const me = getFirstName(ctx);
      const seed = slugify(hint || ctx.projectName || 'aws-project');
      return `${me}-${seed}`.slice(0, 50);
    },
  },

  // ─── Git branch ───
  'git-branch': {
    label: 'Git branch name',
    rules: 'Lowercase, hyphens, slashes. No spaces.',
    examples: ['feat/contact-form', 'fix/cors-headers', 'chore/bump-deps'],
    generate(hint, ctx) {
      const kind = ctx.changeType || 'feat';
      const seed = slugify(hint || 'update');
      return `${kind}/${seed}`;
    },
  },

  // ─── Doc/file titles ───
  'doc-title': {
    label: 'Document title',
    rules: 'Free-form, used in the printable PDF + Markdown export.',
    examples: ['AWS account setup — David — May 2026', 'Project 1 — Portfolio Site — completed'],
    generate(hint, ctx) {
      const me = getFirstName(ctx);
      const Me = me[0]?.toUpperCase() + me.slice(1);
      const month = new Date().toLocaleString('en', { month: 'long', year: 'numeric' });
      return `${hint || ctx.projectName || 'Session'} — ${Me} — ${month}`;
    },
  },

  // ─── CloudFront comment ───
  'cloudfront-comment': {
    label: 'CloudFront distribution comment',
    rules: 'Free-form, shows in the AWS console.',
    examples: ['david-portfolio CDN — May 2026'],
    generate(hint, ctx) {
      const me = getFirstName(ctx);
      const seed = slugify(hint || ctx.projectName || 'site');
      const month = new Date().toLocaleString('en', { month: 'short', year: 'numeric' });
      return `${me}-${seed} CDN — ${month}`;
    },
  },

  // ─── Budget name ───
  'budget-name': {
    label: 'AWS Budget name',
    rules: 'Letters, digits, hyphens. Up to 100 chars.',
    examples: ['monthly-5-dollar-limit', 'david-2026-cap'],
    generate(hint, ctx) {
      const amount = ctx.limitUsd || hint || '5';
      return `monthly-${amount}-dollar-limit`;
    },
  },
};

// ---------------- public API ----------------

export function suggestName(kind, hint, context = {}) {
  const def = NAME_KINDS[kind];
  if (!def) {
    // Fallback: simple slug of the hint with a short id
    return `${slugify(hint || 'name')}-${shortId()}`;
  }
  try {
    return def.generate(hint, context);
  } catch {
    return `${slugify(hint || kind)}-${shortId()}`;
  }
}

/**
 * Render an array of N alternative suggestions for the same kind — useful
 * when the user clicks "Show more" in the UI.
 */
export function suggestVariations(kind, hint, context = {}, count = 3) {
  const base = suggestName(kind, hint, context);
  const out = new Set([base]);
  // Try a few light tweaks
  const tweaks = [
    () => suggestName(kind, hint, { ...context, _seed: 1 }),
    () => suggestName(kind, (hint || '') + '-v2', context),
    () => suggestName(kind, hint, context).replace(/\-\d+$/, '-' + shortId()),
    () => `${suggestName(kind, hint, context)}-${shortDate().slice(4)}`,
  ];
  let i = 0;
  while (out.size < count && i < 20) {
    out.add(tweaks[i % tweaks.length]());
    i++;
  }
  return [...out].slice(0, count);
}

export function describeKind(kind) {
  return NAME_KINDS[kind] || { label: kind, rules: '', examples: [] };
}

// ---------------- utility ----------------

function capWords(s) {
  return s.split(/[-\s_]+/).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}
