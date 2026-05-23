/**
 * UK Transition Planner data — cities, checklists, guides.
 *
 * Costs in GBP / month, conservative student-realistic estimates as of 2026.
 * Hard-coded but easy to update. Not legal or immigration advice.
 */

export const UK_CITIES = [
  {
    id: 'london',
    name: 'London',
    blurb: 'Highest paying market, highest cost. Zones 2-4 are the realistic student catchment.',
    costs: {
      rent: 950,        // single room in shared flat, zones 2-4
      food: 280,
      transport: 200,   // student travelcard
      utilities: 90,    // sharing with flatmates
      phone: 15,
      entertainment: 120,
      courseMaterials: 40,
      misc: 60,
    },
  },
  {
    id: 'manchester',
    name: 'Manchester',
    blurb: 'Strong tech scene, much cheaper than London. Popular with international students.',
    costs: {
      rent: 600,
      food: 240,
      transport: 65,
      utilities: 75,
      phone: 15,
      entertainment: 90,
      courseMaterials: 40,
      misc: 50,
    },
  },
  {
    id: 'birmingham',
    name: 'Birmingham',
    blurb: 'Great-value 2nd city. Solid AWS user-group activity.',
    costs: {
      rent: 580,
      food: 230,
      transport: 60,
      utilities: 70,
      phone: 15,
      entertainment: 80,
      courseMaterials: 40,
      misc: 50,
    },
  },
  {
    id: 'edinburgh',
    name: 'Edinburgh',
    blurb: 'Beautiful, strong universities, good fintech jobs. Slightly pricier than Manchester.',
    costs: {
      rent: 720,
      food: 260,
      transport: 60,
      utilities: 80,
      phone: 15,
      entertainment: 110,
      courseMaterials: 40,
      misc: 55,
    },
  },
  {
    id: 'leeds',
    name: 'Leeds',
    blurb: 'Growing fintech + cloud market. Affordable, big student population.',
    costs: {
      rent: 560,
      food: 230,
      transport: 60,
      utilities: 70,
      phone: 15,
      entertainment: 80,
      courseMaterials: 40,
      misc: 50,
    },
  },
  {
    id: 'glasgow',
    name: 'Glasgow',
    blurb: 'Lowest cost of the major Scottish cities. Strong banking + biotech jobs.',
    costs: { rent: 550, food: 230, transport: 60, utilities: 70, phone: 15, entertainment: 90, courseMaterials: 40, misc: 50 },
  },
  {
    id: 'bristol',
    name: 'Bristol',
    blurb: 'Aerospace + creative tech corridor. Pricier than the North but vibrant.',
    costs: { rent: 720, food: 250, transport: 70, utilities: 80, phone: 15, entertainment: 110, courseMaterials: 40, misc: 55 },
  },
  {
    id: 'nottingham',
    name: 'Nottingham',
    blurb: 'Very affordable Midlands city, strong universities, easy commute to Birmingham.',
    costs: { rent: 520, food: 220, transport: 55, utilities: 65, phone: 15, entertainment: 75, courseMaterials: 40, misc: 45 },
  },
  {
    id: 'sheffield',
    name: 'Sheffield',
    blurb: 'Steel-city turned tech-friendly, lowest rent of the bigger cities.',
    costs: { rent: 500, food: 220, transport: 55, utilities: 65, phone: 15, entertainment: 75, courseMaterials: 40, misc: 45 },
  },
];

export const APPLICATION_STATUSES = [
  { id: 'not-started',     label: 'Not started',     color: 'text-muted border-token bg-[var(--card-2)]' },
  { id: 'in-progress',     label: 'In progress',     color: 'text-electric border-electric/40 bg-electric/10' },
  { id: 'submitted',       label: 'Submitted',       color: 'text-warning border-warning/40 bg-warning/10' },
  { id: 'offer',           label: 'Offer received',  color: 'text-success border-success/40 bg-success/10' },
  { id: 'cas',             label: 'CAS received',    color: 'text-success border-success/40 bg-success/10' },
  { id: 'visa-applied',    label: 'Visa applied',    color: 'text-aws-orange border-aws-orange/40 bg-aws-orange/10' },
  { id: 'visa-approved',   label: 'Visa approved',   color: 'text-success border-success/40 bg-success/10' },
  { id: 'travel-booked',   label: 'Travel booked',   color: 'text-aws-orange border-aws-orange/40 bg-aws-orange/10' },
  { id: 'arrived',         label: 'Arrived in UK 🎉', color: 'text-success border-success/40 bg-success/10' },
];

/**
 * Documents that must be ready BEFORE you advance into each stage.
 * Keyed by APPLICATION_STATUSES.id.
 */
export const STAGE_DOCS = {
  'not-started':   [],
  'in-progress':   ['Passport (valid 6+ months past course end)', 'Two recent passport-style photos', 'Reference letters drafted'],
  'submitted':     ['Application reference saved', 'Application fee receipt', 'Personal statement final'],
  'offer':         ['Offer letter (PDF) downloaded', 'Confirmed deposit payment receipt'],
  'cas':           ['CAS letter received', 'CAS number stored safely'],
  'visa-applied':  ['Financial evidence (28-day rule met)', 'IHS surcharge paid', 'Biometric appointment booked', 'TB test result if required'],
  'visa-approved': ['Decision letter saved', 'BRP / eVisa collection plan'],
  'travel-booked': ['Flight confirmation', 'Accommodation confirmation', 'Airport transfer arranged', 'Travel insurance'],
  'arrived':       ['BRP collected', 'Bank account opened', 'GP registered', 'Council tax exemption letter sent'],
};

export const APPLICATION_DOC_CHECKLIST = [
  'Academic transcripts (originals + certified copies)',
  'Degree certificate / proof of qualifications',
  'English language proof (IELTS / TOEFL / PTE)',
  'Reference letters (typically 2 — academic + professional)',
  'Statement of purpose / personal statement',
  'CV / résumé',
  'Passport (valid 6+ months past course end)',
  'Two recent passport-style photos',
  'Application fee receipt',
];

export const VISA_CHECKLIST = [
  { id: 'offer',          label: 'Unconditional offer letter received',                group: 'pre' },
  { id: 'cas',            label: 'CAS number received from university',                group: 'pre' },
  { id: 'finance',        label: 'Financial evidence — show required £ in account',    group: 'pre' },
  { id: 'english',        label: 'English language proof (IELTS or equivalent)',       group: 'pre' },
  { id: 'transcripts',    label: 'Academic transcripts obtained',                      group: 'pre' },
  { id: 'translated',     label: 'Documents translated if not in English',             group: 'pre' },
  { id: 'certified',      label: 'Documents officially certified',                     group: 'pre' },
  { id: 'form',           label: 'Visa application form completed online',             group: 'apply' },
  { id: 'ihs',            label: 'IHS surcharge paid (£776 per year of study)',        group: 'apply' },
  { id: 'biometric',      label: 'Biometrics appointment booked',                      group: 'apply' },
  { id: 'medical',        label: 'TB test if required (country-dependent)',            group: 'apply' },
  { id: 'docs-assembled', label: 'Supporting documents assembled',                     group: 'apply' },
  { id: 'submit',         label: 'Visa application submitted',                         group: 'apply' },
  { id: 'decision',       label: 'Decision received',                                  group: 'post' },
  { id: 'brp',            label: 'BRP card collection point noted',                    group: 'post' },
  { id: 'travel',         label: 'Travel booked',                                      group: 'post' },
  { id: 'accommodation',  label: 'UK accommodation confirmed',                         group: 'post' },
];

export const WORK_RIGHTS = [
  {
    id: '20h-term',
    title: '20 hours/week during term',
    body: 'Tier 4 / Student visa allows up to 20 hours of paid work per week DURING term. This includes self-employed/freelance work. You must not exceed this.',
  },
  {
    id: 'fulltime-holiday',
    title: 'Full-time during official holidays',
    body: 'Vacations + dissertation period typically count as holiday. Your university confirms term dates to UKVI — keep their official letter on file.',
  },
  {
    id: 'remote-freelance',
    title: 'Remote freelancing for non-UK clients',
    body: 'Still counted under your weekly hour limit. The work BEING remote does not exempt you. Track your hours honestly — UK tax + immigration cross-reference if audited.',
  },
  {
    id: 'tax',
    title: 'Tax on freelance income as student',
    body: 'Register for Self Assessment with HMRC by 5 October following the tax year you started earning. Personal allowance is £12,570/yr (2026). You pay 20% income tax + Class 4 NI above thresholds.',
  },
  {
    id: 'nino',
    title: 'Get a National Insurance number',
    body: 'Apply on gov.uk after arrival. Takes 4-12 weeks. You can start working without it but tell your employer you\'ve applied — they\'ll use an emergency code in the meantime.',
  },
  {
    id: 'bank',
    title: 'Open a UK bank account',
    body: 'Monzo / Starling / Revolut are easiest as a new arrival (no UK address proof needed). Add a UK debit card to Upwork / Wise within the first week.',
  },
  {
    id: 'nhs',
    title: 'Register with a GP under NHS',
    body: 'Free at point of use because you paid the IHS surcharge. Register at a local GP near your address. Required for visa renewals.',
  },
  {
    id: 'council',
    title: 'Council tax exemption as student',
    body: 'Full-time students are exempt. Send your enrolment letter to your local council the moment you sign a tenancy. Avoid backdated charges by acting in week 1.',
  },
];

export const FREELANCE_UK_GUIDE = [
  {
    id: 'platforms',
    title: 'Platforms that work best from the UK',
    body: 'Upwork (global), Toptal (high-end), LinkedIn (UK clients), Hired (employer-led), CWJobs/JobServe (contracts). Avoid Fiverr for AWS work — wrong audience.',
  },
  {
    id: 'targeting',
    title: 'UK client targeting strategy',
    body: 'Lead with timezone + cultural alignment. UK SMEs care a lot about being able to call you during their working day. Set your LinkedIn location to your UK city the day you arrive.',
  },
  {
    id: 'ir35',
    title: 'IR35 (off-payroll working) — the short version',
    body: 'Affects contracts via a limited company. If a contract is "inside IR35", you pay PAYE-like tax. Most student freelance work via Upwork is OUTSIDE IR35 because you control how, when, and where you work — keep that evidence.',
  },
  {
    id: 'sa',
    title: 'Register Self Assessment with HMRC',
    body: 'gov.uk/log-in-file-self-assessment-tax-return → register as self-employed → get a UTR number → file annually by 31 January (online).',
  },
  {
    id: 'wise',
    title: 'Wise account for international receives',
    body: 'Get a UK + USD + EUR + GBP account in one. Cheapest FX for receiving Upwork payouts. Set up direct from your home country before arrival.',
  },
  {
    id: 'declare',
    title: 'Declare freelance income as a student',
    body: 'Track every payment in GBP at the date received. Keep receipts for AWS bills, courses, equipment — they are deductible expenses. A simple spreadsheet beats forgetting.',
  },
];

// =================================================================
// Stage 13 — Banking + payment + IR35 decision tree
// =================================================================

export const PAYMENT_PROVIDERS = [
  {
    id: 'wise',
    name: 'Wise (formerly TransferWise)',
    blurb: 'Best for receiving international payouts (Upwork, Toptal). Near-mid-market FX with low fixed fees.',
    steps: [
      'Sign up at wise.com — verify with passport / ID before you arrive in the UK.',
      'Open the Multi-currency account — gives you USD, EUR, GBP, AUD details simultaneously.',
      'Add the USD bank details to your Upwork "get paid" settings as ACH transfer.',
      'Withdraw GBP for free into your UK bank when you need it.',
      'Use the Wise debit card overseas — better than any high-street bank.',
    ],
  },
  {
    id: 'payoneer',
    name: 'Payoneer',
    blurb: 'Default for Upwork users — instant payouts. Higher FX markup than Wise.',
    steps: [
      'Sign up at payoneer.com (requires invitation link from Upwork is easiest).',
      'Add the USD / EUR / GBP receiving accounts.',
      'In Upwork → Get Paid → choose Payoneer.',
      'Withdraw to your UK bank in GBP — fee £1.50, FX ~2%.',
      'Order the Payoneer Mastercard if you need card access while waiting for a UK debit card.',
    ],
  },
];

export const UK_STUDENT_BANKS = [
  {
    id: 'monzo',
    name: 'Monzo',
    type: 'Digital',
    pros: ['Instant signup with passport', 'Lives in one app', 'Free spending abroad up to £200/mo'],
    cons: ['No physical branch — chat support only'],
    note: 'Best first account on arrival — open before you have UK address proof.',
  },
  {
    id: 'starling',
    name: 'Starling Bank',
    type: 'Digital',
    pros: ['No fees abroad at all', 'Excellent FX rates', 'Joint accounts supported'],
    cons: ['Personal account requires UK address (use temporary while waiting)'],
    note: 'Strongest alternative to Monzo. Pick one, not both.',
  },
  {
    id: 'hsbc-student',
    name: 'HSBC Student',
    type: 'High street',
    pros: ['£0–£3,000 interest-free overdraft', 'Branch network worldwide', 'Pre-arrival account via HSBC International'],
    cons: ['Slower signup', 'Less app-first'],
    note: 'Best if you want a branch presence + want to keep an HSBC relationship long-term.',
  },
  {
    id: 'barclays-student',
    name: 'Barclays Student Additions',
    type: 'High street',
    pros: ['Up to £1,500 interest-free overdraft', 'Apple/Google Pay support', 'Strong app'],
    cons: ['Account opening requires proof of address in many branches'],
    note: 'Stable everyday student account once you have UK address proof.',
  },
];

export const FX_GHS_GBP_TIPS = [
  'Use Wise for GHS→GBP — best rate after Mukuru. Avoid high-street UK banks for FX.',
  'Spot rate moves daily — set a price alert in the Wise app for your target.',
  'Bring £200–£500 cash for the first 48 hours (taxi, SIM, deposit).',
  'Never carry more than £10,000 — anything over that must be declared at UK border.',
];

export const IR35_DECISION = {
  title: 'Does IR35 apply to you?',
  intro: 'IR35 only affects you if you contract via your own UK limited company. Most student freelancers do NOT need to worry about it.',
  branches: [
    {
      q: 'Are you working through your own UK limited company (Ltd)?',
      answers: [
        { a: 'No — I freelance as a sole trader / Upwork / direct invoices', verdict: 'IR35 does NOT apply. Just Self Assessment.' },
        { a: 'Yes — I have a UK Ltd', next: 1 },
      ],
    },
    {
      q: 'Is the end client based in the UK and a "medium / large" business?',
      answers: [
        { a: 'No — overseas client OR small UK business', verdict: 'IR35 does NOT apply. Self-determine status.' },
        { a: 'Yes — UK medium/large client', next: 2 },
      ],
    },
    {
      q: 'Do you control HOW, WHEN, and WHERE the work is done?',
      answers: [
        { a: 'Yes — I set the schedule and method', verdict: 'OUTSIDE IR35 — keep evidence (your contract, screenshots of your independence).' },
        { a: 'No — they direct me like an employee', verdict: 'INSIDE IR35 — they will deduct PAYE-equivalent tax. Consider whether the contract is worth it.' },
      ],
    },
  ],
};

export const UNI_COMMS_TEMPLATE = [
  {
    id: 'check-application',
    label: 'Status check — pre-decision',
    body: `Dear Admissions team,

I hope you are well. I am writing to check the status of my application submitted on [DATE], reference [REF]. Could you confirm whether my file is complete and if any further documents are required?

I appreciate your time and look forward to your reply.

Best regards,
[Your name]
Application reference: [REF]`,
  },
  {
    id: 'request-cas',
    label: 'Request CAS after offer',
    body: `Dear [Contact],

Thank you for the unconditional offer for [PROGRAMME] starting [START DATE]. I have paid the [AMOUNT] deposit on [DATE] (reference [TRANSACTION]). Could you please initiate my CAS so I can begin my visa application?

I am happy to provide any further information you need.

Best regards,
[Your name]`,
  },
];
