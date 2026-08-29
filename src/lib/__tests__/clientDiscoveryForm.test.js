import { appendClientDiscoveryAnswers, buildClientDiscoveryForm, buildSimulatedLearningAnswers, discoveryFormAsText, isSimulatedLearningProject } from '../clientDiscoveryForm.js';
import { runPipeline } from '../gigSolutionPipeline.js';

export function runClientDiscoveryFormTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };

  test('vague work becomes a categorized project-specific client form', () => {
    const solution = runPipeline('Build an EC2-hosted website.');
    const fields = buildClientDiscoveryForm(solution);
    const categories = new Set(fields.map((field) => field.category));
    for (const category of ['Cost & residency', 'Cost', 'Business', 'Users', 'Security & recovery', 'Operations', 'Acceptance']) {
      assert(categories.has(category), `missing ${category}`);
    }
    assert(fields.some((field) => /domain/i.test(field.question)), 'web-specific domain question missing');
  });

  test('shareable form warns against secrets and retains questions', () => {
    const fields = buildClientDiscoveryForm(runPipeline('Build an EC2-hosted website.'));
    const text = discoveryFormAsText('Website', fields);
    assert(/do not include passwords/i.test(text), 'secret warning missing');
    assert(text.includes(fields[0].question), 'question missing from copied form');
  });

  test('incomplete answers cannot be approved', () => {
    const fields = buildClientDiscoveryForm(runPipeline('Build an EC2-hosted website.'));
    let rejected = false;
    try { appendClientDiscoveryAnswers('brief', fields, {}); } catch { rejected = true; }
    assert(rejected, 'blank form was accepted');
  });

  test('completed answers are labelled as client input and never deployment approval', () => {
    const fields = buildClientDiscoveryForm(runPipeline('Build an EC2-hosted website.'));
    const answers = Object.fromEntries(fields.map((field) => [field.id, 'Client confirmed this decision.']));
    const brief = appendClientDiscoveryAnswers('Build an EC2-hosted website.', fields, answers);
    assert(/Client-approved discovery answers/.test(brief), 'answer marker missing');
    assert(/not independently verified deployment evidence/.test(brief), 'evidence boundary missing');
    assert(/No answer authorizes AWS deployment/.test(brief), 'deployment approval boundary missing');
  });

  test('Unknown answers remain open instead of falsely closing readiness gates', () => {
    const original = runPipeline('Build an EC2-hosted website.');
    const fields = buildClientDiscoveryForm(original);
    const answers = Object.fromEntries(fields.map((field) => [field.id, 'Unknown']));
    const rebuilt = runPipeline(appendClientDiscoveryAnswers(original.input.brief, fields, answers));
    assert(rebuilt.analysis.missingQuestions.length > 0, 'unknown answers falsely completed discovery');
    assert(!rebuilt.review.readiness.clientReady, 'unknown answers falsely passed readiness');
  });

  test('simulated portfolio labs receive transparent safe project-owner defaults', () => {
    const solution = runPipeline('Portfolio learning project treated as a simulated client gig. Build a Windows Server lab using synthetic, non-sensitive learning data only.');
    const fields = buildClientDiscoveryForm(solution);
    const answers = buildSimulatedLearningAnswers(solution, fields);
    assert(isSimulatedLearningProject(solution), 'simulated project was not detected');
    assert(answers && fields.every((field) => String(answers[field.id] || '').trim()), 'safe defaults did not complete every generated field');
    assert(Object.values(answers).some((answer) => /USD 20\/month/.test(answer)), 'cost ceiling was not disclosed');
    assert(Object.values(answers).some((answer) => /synthetic/i.test(answer)), 'synthetic-data boundary was not disclosed');
  });

  test('common simulated portfolio learning lab wording enables safe defaults', () => {
    const solution = runPipeline('Build a Windows Server training project. This is a simulated portfolio learning lab using synthetic data.');
    assert(isSimulatedLearningProject(solution), 'common simulated-lab wording was not recognized');
  });

  test('real client work never receives invented discovery answers', () => {
    const solution = runPipeline('A real client needs an EC2-hosted production website.');
    const fields = buildClientDiscoveryForm(solution);
    assert(!isSimulatedLearningProject(solution), 'real client work was classified as simulated');
    assert(buildSimulatedLearningAnswers(solution, fields) === null, 'real client answers were fabricated');
  });

  return { results, allPassed: results.every((result) => result.pass) };
}
