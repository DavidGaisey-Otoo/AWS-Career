/**
 * Gamification catalog — 10 levels + 40+ badges + XP point values.
 *
 * Badge detection rules are pure functions over a `ctx` object containing
 * the snapshots from RoadmapContext, LearningContext, ExamContext,
 * FreelanceContext, PortfolioContext, AppContext. See GamificationContext
 * for the ctx shape.
 */

// ---------- XP point values ----------
export const XP = {
  subtask:          10,
  task:             50,
  phase:            500,
  project:          1000,
  topicQuizPass:    100,
  labComplete:      200,
  examPass:         300,
  proposalSent:     150,
  clientResponse:   200,
  clientLanded:     1000,
  firstDollar:      2000,
  dailyLogin:       25,
  streak7:          500,
  streak30:         2000,
  streak100:        5000,
};

// ---------- 10 levels ----------
export const LEVELS = [
  { n: 1,  name: 'Cloud Newbie',      min: 0,      max: 1000,    icon: '☁',  color: 'from-slate-400 to-slate-600' },
  { n: 2,  name: 'Cloud Explorer',    min: 1001,   max: 3000,    icon: '🧭', color: 'from-electric to-cyan-400' },
  { n: 3,  name: 'Cloud Builder',     min: 3001,   max: 7000,    icon: '🛠', color: 'from-sky-400 to-blue-500' },
  { n: 4,  name: 'Cloud Engineer',    min: 7001,   max: 15000,   icon: '⚙', color: 'from-blue-500 to-indigo-600' },
  { n: 5,  name: 'Cloud Architect',   min: 15001,  max: 30000,   icon: '🏛', color: 'from-indigo-500 to-purple-600' },
  { n: 6,  name: 'Cloud Expert',      min: 30001,  max: 55000,   icon: '🎯', color: 'from-purple-500 to-pink-500' },
  { n: 7,  name: 'Cloud Master',      min: 55001,  max: 90000,   icon: '🏆', color: 'from-pink-500 to-rose-500' },
  { n: 8,  name: 'Cloud Champion',    min: 90001,  max: 140000,  icon: '👑', color: 'from-amber-400 to-orange-500' },
  { n: 9,  name: 'Cloud Legend',      min: 140001, max: 200000,  icon: '⚡', color: 'from-aws-orange to-yellow-400' },
  { n: 10, name: 'AWS Grandmaster',   min: 200001, max: Infinity,icon: '🌟', color: 'from-aws-orange via-pink-500 to-electric' },
];

export function levelForXp(xp) {
  return LEVELS.find((l) => xp >= l.min && xp <= l.max) || LEVELS[LEVELS.length - 1];
}

export function nextLevelInfo(xp) {
  const cur = levelForXp(xp);
  if (cur.n >= 10) {
    return { current: cur, next: null, pctToNext: 100, xpToNext: 0 };
  }
  const next = LEVELS[cur.n];           // next is index cur.n (cur.n is 1-based)
  const span = cur.max - cur.min + 1;
  const into = xp - cur.min;
  const pct = Math.max(0, Math.min(100, Math.round((into / span) * 100)));
  return {
    current: cur,
    next,
    pctToNext: pct,
    xpToNext: Math.max(0, cur.max + 1 - xp),
  };
}

// ---------- 40+ badges ----------

const badge = (id, opts) => ({
  id,
  category: opts.category || 'first-steps',
  rarity: opts.rarity || 'common',     // common | rare | epic | legendary | secret
  icon: opts.icon || '🏅',
  name: opts.name,
  description: opts.description,
  secret: opts.secret || false,
  test: opts.test,                     // (ctx) => boolean
  xp: opts.xp || 0,                    // bonus XP awarded on unlock
});

// ---------- First-steps ----------
const firstSteps = [
  badge('first-login', {
    category: 'first-steps', rarity: 'common', icon: '👋',
    name: 'First login', description: 'Welcome aboard.', xp: 25,
    test: (c) => !!c.profile?.createdAt || !!c.profile?.onboarded,
  }),
  badge('profile-complete', {
    category: 'first-steps', icon: '🪪',
    name: 'Profile complete', description: 'Filled in name, level, goal, hours, target.', xp: 50,
    test: (c) => !!c.profile?.name && !!c.profile?.level && !!c.profile?.goal && !!c.profile?.hours && !!c.profile?.targetDate,
  }),
  badge('first-task', {
    icon: '✅', name: 'First task',
    description: 'Ticked your first subtask.', xp: 25,
    test: (c) => c.roadmap?.subtasksDone >= 1,
  }),
  badge('first-project-started', {
    icon: '🚧', name: 'First project started',
    description: 'Began your first portfolio project.', xp: 75,
    test: (c) => c.portfolio?.startedCount >= 1,
  }),
  badge('first-article-written', {
    icon: '📝', name: 'First article written',
    description: 'Notes or write-up populated on a project.', xp: 100,
    test: (c) => c.portfolio?.notesFilledCount >= 1,
  }),
];

// ---------- Learning ----------
const learning = [
  badge('quiz-master', {
    category: 'learning', rarity: 'rare', icon: '🧠',
    name: 'Quiz Master', description: '10 perfect quiz scores.', xp: 300,
    test: (c) => (c.learning?.perfectQuizzes || 0) >= 10,
  }),
  badge('lab-rat', {
    category: 'learning', rarity: 'rare', icon: '🧪',
    name: 'Lab Rat', description: 'Completed 10 hands-on labs.', xp: 300,
    test: (c) => (c.learning?.labsDone || 0) >= 10,
  }),
  badge('streak-7', {
    category: 'learning', icon: '🔥', name: 'Study Streak 7',
    description: '7 days in a row.', xp: 200,
    test: (c) => (c.roadmap?.streak?.longest || 0) >= 7,
  }),
  badge('streak-30', {
    category: 'learning', rarity: 'rare', icon: '🔥',
    name: 'Study Streak 30', description: '30 days in a row.', xp: 600,
    test: (c) => (c.roadmap?.streak?.longest || 0) >= 30,
  }),
  badge('streak-100', {
    category: 'learning', rarity: 'epic', icon: '🔥',
    name: 'Study Streak 100', description: '100 days. Unstoppable.', xp: 2000,
    test: (c) => (c.roadmap?.streak?.longest || 0) >= 100,
  }),
  badge('all-nighter', {
    category: 'learning', rarity: 'rare', icon: '🌙',
    name: 'All Nighter', description: 'Studied past midnight.',
    test: (c) => c.roadmap?.studiedAfterMidnight === true,
  }),
  badge('early-bird', {
    category: 'learning', rarity: 'rare', icon: '🐦',
    name: 'Early Bird', description: 'Studied before 6am.',
    test: (c) => c.roadmap?.studiedBefore6am === true,
  }),
  badge('speed-demon', {
    category: 'learning', rarity: 'rare', icon: '⚡',
    name: 'Speed Demon', description: 'Finished a task in half the estimated time.',
    test: (c) => c.roadmap?.fastTaskFlag === true,
  }),
  badge('perfectionist', {
    category: 'learning', rarity: 'epic', icon: '💯',
    name: 'Perfectionist', description: '100% on any exam.',
    test: (c) => (c.exam?.bestPercentAny || 0) >= 100,
  }),
  badge('domain-expert', {
    category: 'learning', rarity: 'epic', icon: '🎓',
    name: 'Domain Expert', description: '90%+ in every domain of one cert.',
    test: (c) => c.exam?.allDomainsAbove90 === true,
  }),
];

// ---------- Career ----------
const career = [
  badge('first-proposal', {
    category: 'career', icon: '✉', name: 'First Proposal',
    description: 'Sent your first proposal.', xp: 100,
    test: (c) => (c.freelance?.proposalsSent || 0) >= 1,
  }),
  badge('first-response', {
    category: 'career', icon: '💬', name: 'First Response',
    description: 'A client replied.', xp: 200,
    test: (c) => (c.freelance?.proposalsResponded || 0) >= 1,
  }),
  badge('first-dollar', {
    category: 'career', rarity: 'rare', icon: '💵', name: 'First Dollar',
    description: 'Earned your first income.', xp: 2000,
    test: (c) => (c.freelance?.lifetimeEarningsUSD || 0) > 0,
  }),
  badge('client-magnet', {
    category: 'career', rarity: 'rare', icon: '🧲',
    name: 'Client Magnet', description: 'Working with 5 clients.', xp: 600,
    test: (c) => (c.freelance?.clientsCount || 0) >= 5,
  }),
  badge('five-star', {
    category: 'career', rarity: 'rare', icon: '⭐',
    name: 'Five Star', description: 'Received a 5-star rating.',
    test: (c) => (c.freelance?.fiveStarRatings || 0) >= 1,
  }),
  badge('negotiator', {
    category: 'career', rarity: 'rare', icon: '🤝',
    name: 'Negotiator', description: 'Successfully negotiated rate up.',
    test: (c) => c.freelance?.negotiationWin === true,
  }),
];

// ---------- Achievement ----------
const achievement = [
  badge('portfolio-complete', {
    category: 'achievement', rarity: 'legendary', icon: '🏆',
    name: 'Portfolio Complete', description: 'All 8 projects shipped.', xp: 3000,
    test: (c) => (c.portfolio?.completeCount || 0) >= 8,
  }),
  badge('cert-hunter', {
    category: 'achievement', rarity: 'rare', icon: '🎖',
    name: 'Cert Hunter', description: 'Earned your first AWS certification.', xp: 1000,
    test: (c) => (c.exam?.earnedCount || 0) >= 1,
  }),
  badge('architect', {
    category: 'achievement', icon: '🏛',
    name: 'Architect', description: 'Built your first architecture diagram.', xp: 200,
    test: (c) => (c.ai?.diagramCount || 0) >= 1,
  }),
  badge('community-helper', {
    category: 'achievement', rarity: 'rare', icon: '🫶',
    name: 'Community Helper', description: 'Helped 5 people in the forum.', xp: 500,
    test: (c) => (c.community?.helpfulReplies || 0) >= 5,
  }),
  badge('mentor', {
    category: 'achievement', rarity: 'rare', icon: '🧑‍🏫',
    name: 'Mentor', description: 'Became a study-buddy mentor.', xp: 500,
    test: (c) => c.community?.isMentor === true,
  }),
  badge('content-creator', {
    category: 'achievement', rarity: 'rare', icon: '✍',
    name: 'Content Creator', description: 'Published 5 articles or posts.', xp: 500,
    test: (c) => (c.community?.postsAuthored || 0) >= 5,
  }),
  badge('pomodoro-pro', {
    category: 'achievement', rarity: 'rare', icon: '🍅',
    name: 'Pomodoro Pro', description: 'Completed 25 Pomodoro sessions.', xp: 300,
    test: (c) => (c.wellness?.pomodorosDone || 0) >= 25,
  }),
  badge('journaler', {
    category: 'achievement', icon: '📓',
    name: 'Reflector', description: 'Wrote 4 weekly reflections.', xp: 200,
    test: (c) => (c.wellness?.journalEntries || 0) >= 4,
  }),
];

// ---------- Secret rare badges ----------
const secret = [
  badge('night-owl-king', {
    category: 'secret', rarity: 'epic', icon: '🦉', secret: true,
    name: 'Night Owl King', description: 'Studied past 3am.', xp: 500,
    test: (c) => c.roadmap?.studiedAfter3am === true,
  }),
  badge('weekend-warrior', {
    category: 'secret', rarity: 'epic', icon: '⚔', secret: true,
    name: 'Weekend Warrior', description: 'Studied both Sat + Sun for 4 weeks.', xp: 800,
    test: (c) => (c.roadmap?.weekendWeeks || 0) >= 4,
  }),
  badge('marathon', {
    category: 'secret', rarity: 'epic', icon: '🏃', secret: true,
    name: 'Marathon', description: '8+ hours of study in a single day.', xp: 800,
    test: (c) => (c.roadmap?.longestDayMinutes || 0) >= 480,
  }),
  badge('comeback-kid', {
    category: 'secret', rarity: 'rare', icon: '🌅', secret: true,
    name: 'Comeback Kid', description: 'Came back after a 14-day break.', xp: 400,
    test: (c) => c.roadmap?.comebackAfter14d === true,
  }),
  badge('lucky-777', {
    category: 'secret', rarity: 'legendary', icon: '🎰', secret: true,
    name: 'Lucky Number', description: 'Scored exactly 777 on a practice exam.', xp: 1000,
    test: (c) => (c.exam?.exactScores || []).includes(777),
  }),
];

export const BADGES = [
  ...firstSteps,
  ...learning,
  ...career,
  ...achievement,
  ...secret,
];

export const RARITY_META = {
  common:    { label: 'Common',    color: 'text-muted border-token bg-[var(--card-2)]' },
  rare:      { label: 'Rare',      color: 'text-electric border-electric/40 bg-electric/10' },
  epic:      { label: 'Epic',      color: 'text-aws-orange border-aws-orange/40 bg-aws-orange/10' },
  legendary: { label: 'Legendary', color: 'text-warning border-warning/40 bg-warning/10' },
  secret:    { label: 'Secret',    color: 'text-purple-400 border-purple-400/40 bg-purple-400/10' },
};

export const CATEGORY_META = {
  'first-steps': { label: 'First steps' },
  learning:      { label: 'Learning' },
  career:        { label: 'Career' },
  achievement:   { label: 'Achievements' },
  secret:        { label: 'Secret' },
};

// ---------- Streak milestones (animations on the page) ----------
export const STREAK_MILESTONES = [7, 30, 60, 100, 365];

// ---------- Synthetic leaderboard seed ----------
//   The user's slot is computed live from their XP and inserted alongside.
export const LEADERBOARD_SEED = [
  { id: 'lb-1',  name: 'Akua Mensah',     country: 'Ghana',          xp: 198200, country_flag: '🇬🇭' },
  { id: 'lb-2',  name: 'Daniel Park',     country: 'South Korea',    xp: 174320, country_flag: '🇰🇷' },
  { id: 'lb-3',  name: 'Priya Sharma',    country: 'India',          xp: 156870, country_flag: '🇮🇳' },
  { id: 'lb-4',  name: 'Carlos Mendoza',  country: 'Mexico',         xp: 134200, country_flag: '🇲🇽' },
  { id: 'lb-5',  name: 'Adaeze Okafor',   country: 'Nigeria',        xp: 118450, country_flag: '🇳🇬' },
  { id: 'lb-6',  name: 'Sarah O\'Brien',  country: 'Ireland',        xp:  98700, country_flag: '🇮🇪' },
  { id: 'lb-7',  name: 'Yuki Tanaka',     country: 'Japan',          xp:  88200, country_flag: '🇯🇵' },
  { id: 'lb-8',  name: 'Liam Anderson',   country: 'United States',  xp:  74300, country_flag: '🇺🇸' },
  { id: 'lb-9',  name: 'Khulile Dlamini', country: 'South Africa',   xp:  62100, country_flag: '🇿🇦' },
  { id: 'lb-10', name: 'Mateusz Kowalski',country: 'Poland',         xp:  55020, country_flag: '🇵🇱' },
  { id: 'lb-11', name: 'Léa Dubois',      country: 'France',         xp:  47900, country_flag: '🇫🇷' },
  { id: 'lb-12', name: 'Anesu Chitiyo',   country: 'Zimbabwe',       xp:  41200, country_flag: '🇿🇼' },
  { id: 'lb-13', name: 'Hassan Khalil',   country: 'United Arab Emirates', xp: 36800, country_flag: '🇦🇪' },
  { id: 'lb-14', name: 'Kwame Boateng',   country: 'Ghana',          xp:  33500, country_flag: '🇬🇭' },
  { id: 'lb-15', name: 'Sofia Rossi',     country: 'Italy',          xp:  29900, country_flag: '🇮🇹' },
  { id: 'lb-16', name: 'Joseph Mensah',   country: 'Ghana',          xp:  24300, country_flag: '🇬🇭' },
  { id: 'lb-17', name: 'Bernard Owusu',   country: 'Ghana',          xp:  18400, country_flag: '🇬🇭' },
  { id: 'lb-18', name: 'Faith Asante',    country: 'Ghana',          xp:  12100, country_flag: '🇬🇭' },
  { id: 'lb-19', name: 'Emeka Nwosu',     country: 'Nigeria',        xp:   9800, country_flag: '🇳🇬' },
  { id: 'lb-20', name: 'Aaliyah Brown',   country: 'Jamaica',        xp:   6400, country_flag: '🇯🇲' },
];

// Weekly XP gains (synthetic, for the "This week" board)
export const LEADERBOARD_WEEKLY = LEADERBOARD_SEED.map((u, i) => ({
  id: u.id,
  weeklyXp: Math.round(2400 - i * 90 + (i % 3) * 60),
}));
