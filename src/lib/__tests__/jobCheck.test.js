/**
 * What an end-to-end test run with a real post turned up.
 *
 * A live Lemon.io ad asked for 4–5+ years of DevOps experience and was a
 * talent-network ad, not a client project — and the job check scored it
 * 64% with no warning at all. A partial profile crashed the check, which
 * left the contract total at $0. And project names were cut mid-word
 * ("A Small Bakery In Ac"), straight into AWS tags and the invoice.
 */
import { analyzeJob, experienceYearsAsked, isRecruiterAd } from '../../data/jobAnalyzer.js';
import { extractProjectName, shortenAtWord } from '../briefExtractor.js';
import { clientNeed, mentions } from '../clientVoice.js';
import { generateSmartProposal } from '../smartProposalGenerator.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const RECRUITER = `Lemon.io helps companies in the US and Europe hire experienced engineers.
We find the projects. No client hunting or rate negotiations. 4+ years of experience as a
DevOps Engineer. 3+ years of experience with AWS. Apply and complete your profile.
Typical time to first project: 3 weeks. Join the community.`;

export function runJobCheckTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test('years of experience asked for are found', () => {
    assert(experienceYearsAsked('5+ years of experience with AWS') === 5, '5+ years missed');
    assert(experienceYearsAsked('At least 3 years of experience using Linux') === 3, '3 years missed');
    assert(experienceYearsAsked(RECRUITER) === 4, `got ${experienceYearsAsked(RECRUITER)}`);
  });

  test('"years" that are not experience are not counted', () => {
    assert(experienceYearsAsked('Keep 3 years of logs in S3') === 0, 'log retention counted');
    assert(experienceYearsAsked('This is a 2 year contract') === 0, 'contract length counted');
  });

  test('a post demanding years you may not have is flagged red, never "strong match"', () => {
    const a = analyzeJob(`We need a static site on S3 and CloudFront. Budget $400. ${'5+ years of experience required.'}`);
    assert(a.flags.some((f) => f.kind === 'red' && /5\+ years/.test(f.msg)), JSON.stringify(a.flags));
    assert(!a.flags.some((f) => f.kind === 'green'), 'called a strong match despite the experience ask');
  });

  test('a talent-network ad is told apart from a client project', () => {
    assert(isRecruiterAd(RECRUITER), 'recruiter ad not detected');
    assert(!isRecruiterAd('We are a bakery and need our website moved to AWS. Budget $400.'), 'client brief flagged as recruiter');
    assert(analyzeJob(RECRUITER).flags.some((f) => /not a client project/.test(f.msg)), 'no recruiter flag');
  });

  test('a partial profile does not crash the job check', () => {
    const a = analyzeJob('Static website on S3, budget $400', { name: 'David' });
    assert(a && Number.isFinite(a.match), 'analysis failed with a partial profile');
  });

  test('a fixed budget in the brief reaches the analysis', () => {
    const a = analyzeJob('We need our static website moved to AWS. Budget around $400 fixed price.');
    assert(a.budget.kind === 'fixed' && a.budget.amount === 400, JSON.stringify(a.budget));
  });

  test('project names are cut at a whole word, with nothing left dangling', () => {
    assert(shortenAtWord('Lumen Bakery (fictional), a small bakery in Accra and Kumasi too', 60) === 'Lumen Bakery (fictional), a small bakery in Accra and Kumasi', shortenAtWord('Lumen Bakery (fictional), a small bakery in Accra and Kumasi too', 60));
    const cut = shortenAtWord('Test client — Lumen Bakery (fictional), a small bakery in Accra', 60);
    assert(!/\bAc$/.test(cut) && !/\s(?:in|a|of)$/i.test(cut), cut);
    assert(shortenAtWord('Short title', 60) === 'Short title', 'short title changed');
  });

  test('"two weeks" does not make a proposal about EKS (Kubernetes)', () => {
    const p = generateSmartProposal({ jd: 'We need our static website moved to AWS within two weeks. Budget $400. A few words of copy.' });
    assert(!p.analysis.services.includes('eks') && !p.analysis.services.includes('rds'), JSON.stringify(p.analysis.services));
    assert(!/\bEKS\b/.test(p.fullText), 'proposal mentions EKS');
  });

  test("the proposal answers the client in your voice, not theirs", () => {
    const p = generateSmartProposal({ jd: 'Hi, I run a bakery in Accra.\nWe need our website moved off shared hosting onto AWS. Budget $400.' });
    assert(!/you need we need/i.test(p.fullText), 'pasted "we need" back');
    assert(/your website moved off shared hosting onto AWS/.test(p.fullText), 'need not turned round, or AWS lowercased');
    assert(!/\baws\b/.test(p.fullText.replace(/AWS/g, '')), 'lowercased aws');
  });

  test('a greeting never becomes the project name', () => {
    const name = extractProjectName('Hi, I run Lumen Bakery, a small bakery in Accra.\nWe need our website moved off shared hosting onto AWS.');
    assert(!/^Hi\b/i.test(name) && /Website/i.test(name), name);
  });

  test('a plain-English brief gets likely services, kept apart from named ones', () => {
    const p = generateSmartProposal({ jd: 'We need our static site on our own domain with HTTPS and a contact form. Budget $400.' });
    assert(p.analysis.services.length === 0, 'inferred services reported as requested');
    assert(['s3', 'cloudfront', 'route53'].every((s) => p.analysis.inferredServices.includes(s)), JSON.stringify(p.analysis.inferredServices));
    const wp = generateSmartProposal({ jd: 'We need our WordPress shop with a database moved to AWS.' });
    assert(wp.analysis.inferredServices.length === 0, 'guessed a static design for a dynamic site');
  });

  test('the approach makes no performance promise nobody has measured', () => {
    const p = generateSmartProposal({ jd: 'We need our static website on CloudFront and S3 with Route 53. Budget $400.' });
    assert(!/sub-\d+\s*ms|\d+\s*ms response|failover/i.test(p.fullText), 'unmeasured performance claim in the approach');
  });

  test('client voice: need sentence found, pronouns turned round, AWS kept', () => {
    assert(clientNeed('Looking for an AWS expert to set up our S3 backups.') === 'set up your S3 backups', clientNeed('Looking for an AWS expert to set up our S3 backups.'));
    assert(clientNeed('I need help to migrate my WordPress site to Lightsail.') === 'migrate your WordPress site to Lightsail', 'wordpress need');
    assert(mentions('Run it on EKS', 'eks') && !mentions('two weeks', 'eks') && !mentions('a few words', 'rds'), 'whole-word match');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
