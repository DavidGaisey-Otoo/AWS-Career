import { mkdirSync, writeFileSync } from 'node:fs';
import { runPipeline } from '../src/lib/gigSolutionPipeline.js';
import { buildProfessionalBrief } from '../src/lib/professionalBriefBuilder.js';
import {
  appendClientDiscoveryAnswers,
  buildClientDiscoveryForm,
  buildSimulatedLearningAnswers,
} from '../src/lib/clientDiscoveryForm.js';
import { appendApprovedPlanningDecisions } from '../src/lib/planningRecommendations.js';

const request = 'Build a temporary Windows Server administration lab on AWS for David Gaisey-Otoo to practise secure server access, user administration, patching, monitoring, backup, restore, evidence capture, and verified teardown. Hard maximum actual session spend is USD 5.';
let brief = buildProfessionalBrief(request, { learning: true, freeTier: true });
let solution = runPipeline(brief);
const fields = buildClientDiscoveryForm(solution);
brief = appendClientDiscoveryAnswers(brief, fields, buildSimulatedLearningAnswers(solution, fields));
brief = appendApprovedPlanningDecisions(brief, {
  environmentMode: 'aws-short-lived',
  labDurationHours: 2,
  region: 'eu-north-1',
  monthlyBudget: 30,
  timelineWeeks: 1,
  dataClassification: 'Synthetic, non-sensitive learning data only',
  backupRetentionDays: 7,
  rpoHours: 24,
  rtoHours: 4,
});
solution = runPipeline(brief);

if (!solution.deploy.canOneClick || !solution.artifacts.cfn.deployReady) {
  throw new Error(`Application safety gate blocked export: ${solution.review.blockers.map((item) => item.title).join('; ') || solution.review.readiness.classification}`);
}

mkdirSync('public/templates', { recursive: true });
writeFileSync('public/templates/david-windows-server-lab.yaml', solution.artifacts.cfn.code, 'utf8');
writeFileSync('public/templates/david-windows-server-lab-brief.txt', brief, 'utf8');
console.log(JSON.stringify({
  title: solution.names.projectName,
  region: solution.region.primary,
  services: solution.services.map((service) => service.id),
  coverage: solution.artifacts.cfn.coverage.pct,
  classification: solution.review.readiness.classification,
}, null, 2));
