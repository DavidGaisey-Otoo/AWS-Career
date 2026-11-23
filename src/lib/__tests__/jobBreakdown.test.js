import { postFacts, assessQualification, takeHome, adviceFor, jobExtras } from '../jobBreakdown.js';
import { payView, parsePay, matchPreferences } from '../jobPreferences.js';
import { MY_PROFILE } from '../myProfile.js';

export function runJobBreakdownTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (err) { results.push({ name, pass: false, error: err.message }); }
  };
  const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg}: expected ${b}, got ${a}`); };

  test('profile claims only the two real certificates', () => {
    eq(MY_PROFILE.certificates.length, 2, 'count');
    eq(MY_PROFILE.certificates.some((c) => /solutions architect/i.test(c.name)), false, 'no SAA claimed');
    eq(MY_PROFILE.studying.some((c) => /solutions architect/i.test(c.name)), true, 'SAA is studying');
  });

  test('facts read skills, years and benefits from the full post', () => {
    const f = postFacts('IT Support Engineer', 'Windows and Active Directory, help desk tickets, 3+ years. We offer health insurance and paid time off.');
    eq(f.skillsAsked.includes('windows'), true, 'windows');
    eq(f.skillsAsked.includes('helpdesk'), true, 'helpdesk');
    eq(f.yearsAsked, 3, 'years');
    eq(f.benefits.includes('Health insurance'), true, 'health');
    eq(f.benefits.includes('Paid time off'), true, 'pto');
  });

  test('the English word "go" is not read as the Go language', () => {
    eq(postFacts('Support', 'You go above and beyond').skillsAsked.includes('go-java'), false, 'go');
  });

  test('"nice to have" and "any language (…)" lists are not requirements', () => {
    const f = postFacts('Associate Support Engineer', 'Linux troubleshooting. Programming fundamentals in any language (bash, Ruby, Javascript, C). Nice-to-have skills: KVM, VMware');
    eq(f.skillsAsked.includes('js'), false, 'js'); eq(f.skillsAsked.includes('virtualization'), false, 'kvm');
    eq(f.skillsAsked.includes('linux-basic'), true, 'linux');
  });

  test('pay written only in the post body is found', () => {
    const f = postFacts('Support Specialist', 'Compensation: Rate starts at $2.50 to $5.00 per hour, paid via Deel');
    eq(f.payText, '$2.50 - $5.00 per hour', 'payText');
    eq(matchPreferences({ title: 'Support Specialist', workType: 'Contract', facts: f }).misses.includes('Under $15/hr'), true, 'too low');
  });

  test('a yearly salary on a contract counts as a full month, not side hours', () => {
    const t = takeHome({ view: payView(parsePay('$60k-$120k/yr')), kind: 'freelance', taxReservePct: 0 });
    eq(Math.round(t.grossMin), 5000, 'month');
  });

  test('a Windows help-desk job he can do → qualify', () => {
    const gig = { title: 'IT Support Engineer', facts: postFacts('IT Support Engineer', 'Windows, help desk, networking, 3+ years') };
    eq(assessQualification(gig).verdict, 'qualify', 'verdict');
  });

  test('TypeScript + React + databases → not yet, with what to learn', () => {
    const gig = { title: 'Technical Support Engineer', facts: postFacts('Technical Support Engineer', 'Strong TypeScript and React, Postgres') };
    const q = assessQualification(gig);
    eq(q.verdict, 'not-yet', 'verdict');
    eq(q.missing.some((m) => m.label.includes('React')), true, 'react gap');
  });

  test('one missing skill → partly', () => {
    const gig = { title: 'Cloud Support Engineer', facts: postFacts('Cloud Support Engineer', 'Linux, networking, Kubernetes') };
    eq(assessQualification(gig).verdict, 'partly', 'verdict');
  });

  test('a senior title is not yet, even if the skills match', () => {
    const gig = { title: 'Senior Network Engineer', facts: postFacts('Senior Network Engineer', 'networking, firewall') };
    eq(assessQualification(gig).verdict, 'not-yet', 'verdict');
  });

  test('no skills listed is unknown, never a pass', () => {
    eq(assessQualification({ title: 'Analyst', facts: postFacts('Analyst', 'Great team.') }).verdict, 'unknown', 'verdict');
  });

  test('take-home on Upwork hourly work: fees and tax reserve come off', () => {
    const t = takeHome({ view: payView(parsePay('$20/hour')), kind: 'freelance', upwork: true, hoursPerMonth: 40, taxReservePct: 20, usdToGhs: 12 });
    // 800 gross − 80 fee − 2 = 718; × 0.8 = 574.4
    eq(Math.round(t.netMin), 574, 'net'); eq(Math.round(t.ghsMin), 6893, 'ghs');
  });

  test('take-home has no cedi figure without a USD rate', () => {
    const t = takeHome({ view: payView(parsePay('$60k/yr')), kind: 'full-time', usdToGhs: null });
    eq(t.ghsMin, null, 'ghs');
  });

  test('hidden pay gives no take-home', () => {
    eq(takeHome({ view: null, kind: 'full-time' }), null, 'null');
  });

  test('advice says skip and what to learn for not-yet jobs', () => {
    const gig = { title: 'Support Engineer', facts: postFacts('Support Engineer', 'TypeScript, React, Postgres') };
    const a = adviceFor({ qualification: assessQualification(gig), match: matchPreferences(gig) });
    eq(a.startsWith('Skip for now'), true, a);
  });

  test('"benefits do not apply" lists no perks', () => {
    const f = postFacts('AI Task Auditor', 'Freelance contract. Company-sponsored benefits such as health insurance and PTO do not apply.');
    eq(f.noBenefits, true, 'flag'); eq(f.benefits.length, 0, 'benefits');
  });

  test('a post that names perks normally still lists them', () => {
    const f = postFacts('Support Engineer', 'We offer health insurance and paid time off.');
    eq(f.noBenefits, false, 'flag'); eq(f.benefits.length, 2, 'benefits');
  });

  test('"deep professional experience" in an AI-chip niche is not yet, not qualify', () => {
    const gig = { title: 'AWS Trainium/NKI (TRN) AI Task Auditor', facts: postFacts('AWS Trainium/NKI (TRN) AI Task Auditor', 'Demonstrable professional experience and deep technical knowledge in AWS Trainium architecture and NKI frameworks.') };
    const q = assessQualification(gig);
    eq(q.verdict, 'not-yet', 'verdict');
    eq(q.missing.some((m) => /AI chips/.test(m.label)), true, 'chip gap');
    eq(matchPreferences(gig).misses.includes('Wants deep professional experience'), true, 'pref miss');
  });

  test('deep expertise with no named gap is at best partly', () => {
    const gig = { title: 'Network Support', facts: postFacts('Network Support', 'Extensive experience with networking and firewalls.') };
    eq(assessQualification(gig).verdict, 'partly', 'verdict');
  });

  test('"proven experience" in an ordinary post does not count as expert-only', () => {
    eq(postFacts('IT Support', 'Proven experience in help desk support').deepExpertise, false, 'deep');
  });

  test('"deep cybersecurity, privacy, and risk management knowledge" is expert-only', () => {
    eq(postFacts('Security Analyst', 'Qualifications: Deep cybersecurity, privacy, and risk management knowledge and skill.').deepExpertise, true, 'deep');
  });

  test('a full stop ends the deep-expertise phrase', () => {
    eq(postFacts('IT Support', 'We go deep. Experience with Windows helps.').deepExpertise, false, 'deep');
  });

  test('a GRC job asking for SOC 2 / ISO 27001 is not a clean qualify', () => {
    const gig = { title: 'Security Analyst - GRC', facts: postFacts('Security Analyst - GRC', 'Familiarity with SOC 2, ISO 27001 and FedRAMP. Experience with AWS control environments.') };
    const q = assessQualification(gig);
    eq(q.missing.some((m) => /SOC 2/.test(m.label)), true, 'grc gap');
    eq(q.verdict === 'qualify', false, 'not qualify');
  });

  test('pay quoted only in US pay zones marks the job as country-limited', () => {
    eq(postFacts('Analyst', 'Within the United States, our geographic pay zones are... Zone 3: All other US locations: $129,900').limitedToCountry, true, 'zones');
    eq(postFacts('Analyst', 'Must be authorized to work in the United States.').limitedToCountry, true, 'auth');
    eq(postFacts('Support', 'We hire worldwide and pay in USD.').limitedToCountry, false, 'open');
  });

  test('payment route, contract type and recruiter are read from the post', () => {
    const f = postFacts('Support Engineer', 'Independent contractor, paid monthly via Deel. We are hiring on behalf of our client, a US MSP.');
    eq(f.contract, 'contractor', 'contract');
    eq(f.payMethods[0].name, 'Deel', 'deel');
    eq(f.recruiterForClient, true, 'recruiter');
  });

  test('US Eastern hours are shown in Ghana time', () => {
    const f = postFacts('NOC Analyst', 'Must work 9-5 EST.');
    const x = jobExtras({ title: 'NOC Analyst', facts: f }, {});
    eq(x.ghanaHours, 'Eastern (US East) 9 am–5 pm ≈ 2 pm–10 pm in Ghana', 'hours');
  });

  test('"Eastern Europe" and the word "et" are not read as US time zones', () => {
    eq(postFacts('Support', 'Team based in Eastern Europe. Liberté et égalité.').workZone, null, 'zone');
  });

  test('nothing stated stays "not stated", never guessed', () => {
    const x = jobExtras({ title: 'IT Support', facts: postFacts('IT Support', 'Help users.') }, {});
    eq(x.payMethods.length, 0, 'pay'); eq(x.ghanaHours, null, 'hours'); eq(x.closingDate, null, 'close');
    eq(x.contractNote, 'Contract type not stated: ask.', 'contract');
  });

  test('priority: a clean fit scores high, a not-yet scores low, and stays within 1–10', () => {
    const fit = { title: 'IT Support Engineer', facts: postFacts('IT Support Engineer', 'Windows, help desk, networking') };
    const hi = jobExtras(fit, { qualification: assessQualification(fit), match: { pay: { min: 1 }, perfect: true, stress: { level: 'low' } }, genuine: { verdict: 'genuine' } });
    const bad = { title: 'Senior Engineer', facts: postFacts('Senior Engineer', 'TypeScript React Postgres') };
    const lo = jobExtras(bad, { qualification: assessQualification(bad), match: { stress: { level: 'high' } }, genuine: { verdict: 'check' } });
    eq(hi.priority, 10, 'high'); eq(lo.priority >= 1 && lo.priority <= 3, true, `low ${lo.priority}`);
  });

  test('very low pay pulls the priority down even when he qualifies', () => {
    const g = { title: 'Technical Support Specialist', facts: postFacts('Technical Support Specialist', 'help desk, documentation') };
    const x = jobExtras(g, { qualification: assessQualification(g), match: { pay: { min: 3 }, misses: ['Under $15/hr'], stress: { level: 'high' } }, genuine: { verdict: 'genuine' } });
    eq(x.priority <= 3, true, `priority ${x.priority}`);
  });

  test('a recruiter post adds the ask-who-the-employer-is step to the checklist', () => {
    const g = { title: 'Helpdesk', facts: postFacts('Helpdesk', 'Hiring on behalf of our client.') };
    eq(jobExtras(g, {}).checklist.some((c) => /real employer/.test(c)), true, 'checklist');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
