import { getGithubAccessToken } from './githubAppAuth.js';

const API = 'https://api.github.com';
const MAX_REPOS = 100;
const MAX_TREE_FILES = 5000;
const MANIFEST_ALLOWLIST = new Set([
  'package.json', 'requirements.txt', 'pyproject.toml', 'pom.xml', 'build.gradle',
  'go.mod', 'cargo.toml', 'dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  'serverless.yml', 'serverless.yaml', 'template.yml', 'template.yaml',
]);

async function github(path, options = {}) {
  const token = await getGithubAccessToken();
  if (!token) throw new Error('Connect GitHub in Settings → Integrations first.');
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('GitHub authorization expired. Reconnect once in Settings → Integrations.');
    if (response.status === 403) throw new Error('GitHub has not authorized this app to read that repository. Review the GitHub App repository selection.');
    throw new Error(`GitHub request failed (${response.status}).`);
  }
  return response.json();
}

export async function listAuthorizedRepositories() {
  const repos = await github(`/user/repos?per_page=${MAX_REPOS}&sort=updated&affiliation=owner,collaborator,organization_member`);
  return repos.map((repo) => ({
    id: repo.id,
    fullName: repo.full_name,
    name: repo.name,
    owner: repo.owner?.login,
    private: Boolean(repo.private),
    defaultBranch: repo.default_branch || 'main',
    description: repo.description || '',
    language: repo.language || null,
    updatedAt: repo.updated_at,
    htmlUrl: repo.html_url,
    archived: Boolean(repo.archived),
    disabled: Boolean(repo.disabled),
    permissions: repo.permissions || {},
  }));
}

export async function listRepositoryBranches(fullName) {
  assertRepoName(fullName);
  const branches = await github(`/repos/${fullName}/branches?per_page=100`);
  return branches.map((branch) => ({ name: branch.name, protected: Boolean(branch.protected) }));
}

export async function inspectRepository(fullName, branch) {
  assertRepoName(fullName);
  const encodedBranch = encodeURIComponent(branch || 'main');
  const tree = await github(`/repos/${fullName}/git/trees/${encodedBranch}?recursive=1`);
  if (tree.truncated || (tree.tree || []).length > MAX_TREE_FILES) {
    throw new Error('Repository is too large for safe browser analysis. Select a smaller deployment branch or analyze it locally.');
  }
  const paths = (tree.tree || []).filter((item) => item.type === 'blob').map((item) => item.path);
  const manifestPaths = paths.filter(isAllowedManifest).slice(0, 20);
  const manifests = {};
  for (const path of manifestPaths) {
    const file = await github(`/repos/${fullName}/contents/${encodePath(path)}?ref=${encodedBranch}`);
    if (file.size > 256_000 || file.encoding !== 'base64') continue;
    manifests[path] = decodeBase64(file.content || '');
  }
  return analyzeRepository({ fullName, branch, paths, manifests });
}

export function analyzeRepository({ fullName = '', branch = 'main', paths = [], manifests = {} }) {
  const lowerPaths = paths.map((path) => path.toLowerCase());
  const packageFiles = Object.entries(manifests)
    .filter(([path]) => path.toLowerCase().endsWith('package.json'))
    .map(([, value]) => parseJson(value) || {});
  const packageJson = packageFiles[0] || {};
  const deps = packageFiles.reduce((all, pkg) => ({ ...all, ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }), {});
  const scripts = packageFiles.reduce((all, pkg) => ({ ...all, ...(pkg.scripts || {}) }), {});
  const has = (name) => Object.prototype.hasOwnProperty.call(deps, name);
  const pathHas = (pattern) => lowerPaths.some((path) => pattern.test(path));
  const secretLikeFiles = paths.filter((path) => /(^|\/)(\.env($|\.)|.*\.(pem|key|p12|pfx)$|id_rsa$|credentials$)/i.test(path));

  let kind = 'unknown';
  let framework = 'Unknown';
  let buildCommand = scripts.build ? 'npm run build' : null;
  let outputDirectory = null;
  let awsPattern = 'Planning only — choose the runtime and hosting model after review.';
  let deployClass = 'planning-only';

  const hasRootDockerfile = lowerPaths.includes('dockerfile');
  const hasFrontend = lowerPaths.some((path) => /^frontend\/(package\.json|src\/)/.test(path));
  const hasPythonBackend = lowerPaths.some((path) => /^backend\/(requirements\.txt|pyproject\.toml|server\.py|main\.py)/.test(path));
  const sensitiveDomain = /health|patient|medical|screening|vital/i.test(`${fullName} ${paths.join(' ')}`);

  if (hasRootDockerfile && hasFrontend && hasPythonBackend) {
    kind = 'fullstack-container'; framework = 'React + Python API + Docker';
    buildCommand = 'docker build';
    awsPattern = 'Private ECR image + one development EC2 instance with encrypted EBS and SSM; MongoDB stays private. Production health data requires a separately reviewed, resilient architecture.';
    deployClass = 'review-required';
  } else if (has('next')) {
    kind = 'fullstack'; framework = 'Next.js';
    awsPattern = 'AWS Amplify Hosting or containerized App Runner/ECS, depending on server-side features.';
    deployClass = 'review-required';
  } else if (has('vite') || has('react-scripts') || has('@angular/core') || has('vue')) {
    kind = 'static-web';
    framework = has('vite') ? 'Vite web app' : has('react-scripts') ? 'Create React App' : has('@angular/core') ? 'Angular' : 'Vue';
    outputDirectory = has('vite') ? 'dist' : has('@angular/core') ? 'dist/<project>' : 'build';
    awsPattern = 'S3 private origin + CloudFront + HTTPS; optional Route 53 domain.';
    deployClass = buildCommand ? 'review-required' : 'planning-only';
  } else if (pathHas(/(^|\/)dockerfile$/)) {
    kind = 'container'; framework = 'Docker container';
    buildCommand = 'docker build';
    awsPattern = 'ECR + App Runner or ECS Fargate; requires port, health check, environment, and database review.';
    deployClass = 'review-required';
  } else if (pathHas(/requirements\.txt$|pyproject\.toml$/)) {
    kind = 'backend'; framework = 'Python';
    awsPattern = 'Lambda/API Gateway for compatible handlers, otherwise App Runner or ECS Fargate.';
    deployClass = 'review-required';
  } else if (pathHas(/pom\.xml$|build\.gradle$/)) {
    kind = 'backend'; framework = 'Java';
    awsPattern = 'App Runner, Elastic Beanstalk, or ECS Fargate after runtime and health-check review.';
    deployClass = 'review-required';
  }

  const infrastructure = [];
  if (pathHas(/\.tf$/)) infrastructure.push('Terraform');
  if (pathHas(/(^|\/)(template|serverless)\.ya?ml$/)) infrastructure.push('CloudFormation/Serverless');
  if (pathHas(/(^|\/)docker-compose\.ya?ml$/)) infrastructure.push('Docker Compose');

  const blockers = [];
  if (kind === 'unknown') blockers.push('Application runtime and build output were not detected.');
  if (secretLikeFiles.length) blockers.push('Secret-like filenames exist; confirm they are ignored and rotate any committed credentials.');
  if (!buildCommand && kind === 'static-web') blockers.push('No build script was found.');
  blockers.push('Environment variables, data classification, domain, traffic, and budget require human confirmation.');
  if (sensitiveDomain) blockers.push('Health/PII project: use synthetic data until privacy, legal, retention, access-control, backup, and incident-response reviews are complete.');

  const deploymentProfile = kind === 'fullstack-container' ? {
    id: sensitiveDomain ? 'health-screening-dev' : 'container-dev',
    label: sensitiveDomain ? 'Health screening — development only' : 'Container development',
    stages: [
      'Build and test the private repository',
      'Scan dependencies, container, and repository history for secrets',
      'Preview the AWS CloudFormation change set and monthly-cost range',
      'Create encrypted development infrastructure after approval',
      'Publish the image through GitHub Actions OIDC (no long-lived GitHub key)',
      'Verify HTTPS, application health, database privacy, logs, and budget alarm',
      'Destroy the CloudFormation stack and verify DELETE_COMPLETE',
    ],
    productionAllowed: false,
  } : null;
  const awsServices = kind === 'fullstack-container'
    ? [
      { id: 'cloudformation', label: 'CloudFormation', purpose: 'Create and destroy the complete stack' },
      { id: 'ecr', label: 'Private ECR', purpose: 'Store the tested application image' },
      { id: 'ec2', label: 'EC2', purpose: 'Run the development application' },
      { id: 'ebs', label: 'Encrypted EBS', purpose: 'Persist application and MongoDB data' },
      { id: 'ssm', label: 'Systems Manager', purpose: 'Manage the server without opening SSH' },
      { id: 'cloudwatch', label: 'CloudWatch', purpose: 'Health, logs, and alarms' },
      { id: 'budgets', label: 'AWS Budgets', purpose: 'Warn before credits or cost limits are exceeded' },
    ]
    : kind === 'static-web'
      ? [
        { id: 'cloudformation', label: 'CloudFormation', purpose: 'Create and destroy the stack' },
        { id: 's3', label: 'Private S3', purpose: 'Store the built website' },
        { id: 'cloudfront', label: 'CloudFront', purpose: 'Serve the site over HTTPS' },
        { id: 'budgets', label: 'AWS Budgets', purpose: 'Monitor usage' },
      ]
      : [];

  return {
    fullName, branch, kind, framework, buildCommand, outputDirectory,
    awsPattern, deployClass, infrastructure, secretLikeFiles,
    fileCount: paths.length,
    manifestsRead: Object.keys(manifests),
    blockers, sensitiveDomain, deploymentProfile, awsServices,
    canDeployNow: false,
    evidenceGates: ['Build succeeds', 'Automated tests pass', 'Secret scan passes', 'Cost approved', 'Development health check passes'],
  };
}

export function repositoryAnalysisBrief(analysis) {
  return `${analysis.fullName} (${analysis.branch}) is a ${analysis.framework} ${analysis.kind} project. Recommended AWS pattern: ${analysis.awsPattern} Build command: ${analysis.buildCommand || 'not detected'}. Deployment must remain blocked until: ${analysis.blockers.join(' ')}`;
}

function assertRepoName(value) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value || '')) throw new Error('Invalid repository name.');
}
function isAllowedManifest(path) {
  const base = path.split('/').pop().toLowerCase();
  return MANIFEST_ALLOWLIST.has(base) || /(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/i.test(path);
}
function encodePath(path) { return path.split('/').map(encodeURIComponent).join('/'); }
function decodeBase64(value) {
  const binary = atob(String(value).replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function findManifest(manifests, basename) {
  const key = Object.keys(manifests).find((path) => path.toLowerCase().endsWith(basename));
  return key ? manifests[key] : '';
}
function parseJson(value) { try { return JSON.parse(value || ''); } catch { return null; } }
