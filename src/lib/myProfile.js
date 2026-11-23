/**
 * myProfile.js — what David actually holds today. Every job in the feed
 * is checked against this, so keep it TRUE: add a certificate or skill
 * only when it is earned (Claude updates this when David says he passed
 * something). Nothing here is shown to clients.
 *
 * Level: entry. He has 7+ years in IT and networking but is new to paid
 * cloud work, so senior cloud titles are "not yet", not "no".
 */

export const MY_PROFILE = Object.freeze({
  level: 'entry',
  yearsInIT: 7,
  education: 'Professional Diploma in IT (Network Administration), First Class',
  certificates: [
    { id: 'aws-ccp', name: 'AWS Certified Cloud Practitioner' },
    { id: 'ccsa', name: 'Check Point CCSA R81' },
  ],
  studying: [
    { id: 'aws-saa', name: 'AWS Solutions Architect – Associate' },
  ],
  // Skill ids from SKILLS below that he can honestly claim today.
  skills: [
    'networking', 'firewall', 'windows', 'helpdesk', 'cctv', 'voip', 'monitoring',
    'servers', 'aws', 'linux-basic', 'docker', 'powershell-basic', 'documentation',
  ],
  updatedAt: '2026-11-21',
});

/**
 * Skills a job post may ask for. `re` finds it in the post; `label` is
 * what David reads; `learn` says how to close the gap.
 */
export const SKILLS = Object.freeze([
  { id: 'networking', label: 'Networking (routing, switching, VPN)', re: /\b(networking|routing|switching|tcp\/ip|vpn|lan|wan|dns|dhcp|vlan)\b/i },
  { id: 'firewall', label: 'Firewalls / security appliances', re: /\b(firewall|check ?point|fortinet|palo alto)\b/i },
  { id: 'windows', label: 'Windows support', re: /\b(windows( server| os| operating)?|active directory|group policy)\b/i },
  { id: 'helpdesk', label: 'Help desk / ticket support', re: /\b(help ?desk|service desk|ticket(ing)?|end[- ]user support|tier[- ]?(1|i|2|ii))\b/i },
  { id: 'cctv', label: 'CCTV / IP cameras / access control', re: /\b(cctv|ip camera|video surveillance|access control)\b/i },
  { id: 'voip', label: 'VoIP / telephony', re: /\b(voip|sip|pbx|telephony)\b/i },
  { id: 'monitoring', label: 'Monitoring (Nagios, alerts)', re: /\b(nagios|zabbix|monitoring|prometheus|grafana)\b/i },
  { id: 'servers', label: 'Servers and backups', re: /\b(server administration|backups?|backup and recovery)\b/i },
  { id: 'aws', label: 'AWS', re: /\b(aws|amazon web services|ec2|s3|iam|cloudfront|route ?53|vpc)\b/i },
  { id: 'linux-basic', label: 'Linux', re: /\b(linux|ubuntu|debian|centos|rhel)\b/i },
  { id: 'docker', label: 'Docker / containers', re: /\b(docker|containers?)\b/i },
  { id: 'powershell-basic', label: 'PowerShell', re: /\bpowershell\b/i },
  { id: 'documentation', label: 'Documentation / knowledge base', re: /\b(documentation|knowledge base|runbooks?)\b/i },
  // Gaps today — each with how to close it.
  { id: 'kubernetes', label: 'Kubernetes', re: /\b(kubernetes|k8s|eks|aks|gke)\b/i, learn: 'a Kubernetes basics course (CKA later)' },
  { id: 'terraform', label: 'Terraform / infrastructure as code', re: /\b(terraform|cloudformation|cdk|pulumi|infrastructure as code|iac)\b/i, learn: 'Terraform basics on your AWS free tier' },
  { id: 'python', label: 'Python', re: /\bpython\b/i, learn: 'Python for automation (scripts for AWS)' },
  { id: 'js', label: 'JavaScript / TypeScript', re: /\b(typescript|javascript|node\.?js)\b/i, learn: 'JavaScript basics' },
  { id: 'react', label: 'React', re: /\breact\b/i, learn: 'React (front-end coding)' },
  { id: 'mobile', label: 'Mobile app coding (iOS / Android)', re: /\b(swift|objective-c|kotlin|ios development|android development)\b/i, learn: 'mobile development (a different career path)' },
  { id: 'go-java', label: 'Go / Java / C#', re: /\b(golang|java(?!script)|c#|\.net)\b/i, learn: 'a back-end language' },
  { id: 'databases', label: 'Databases (SQL, Postgres, MySQL)', re: /\b(sql|postgres(ql)?|mysql|database internals)\b/i, learn: 'SQL basics, then AWS RDS' },
  { id: 'azure', label: 'Microsoft Azure / Intune', re: /\b(azure|intune|entra id|microsoft 365 admin)\b/i, learn: 'AZ-900, then Intune basics' },
  { id: 'gcp', label: 'Google Cloud', re: /\b(gcp|google cloud)\b/i, learn: 'Google Cloud basics' },
  { id: 'virtualization', label: 'KVM / OpenStack / VMware', re: /\b(kvm|openstack|vmware|hyper-v|virtuali[sz]ation)\b/i, learn: 'VMware or KVM home lab' },
  { id: 'ci-cd', label: 'CI/CD pipelines', re: /\b(ci\/cd|jenkins|github actions|gitlab ci)\b/i, learn: 'GitHub Actions basics' },
  { id: 'serverless', label: 'AWS Lambda / serverless', re: /\b(lambda|serverless|api gateway|step functions)\b/i, learn: '2–3 small Lambda + API Gateway projects on your free tier' },
  { id: 'grc', label: 'Compliance frameworks (SOC 2, ISO 27001, FedRAMP)', re: /\b(soc ?2|iso ?2700[12]|iso ?27701|fedramp|pci[- ]dss|hipaa|nist (800-53|csf)|grc)\b/i, learn: 'a compliance basics course (ISO 27001 Foundation) and mapping AWS controls to SOC 2' },
  { id: 'ai-chips', label: 'AI chips (Trainium / Neuron / CUDA kernels)', re: /\b(trainium|inferentia|neuron sdk|nki|neuron kernel|cuda|gpu kernels?)\b/i, learn: 'specialist AI-hardware work (a different path; not worth chasing)' },
]);

const HAVE = new Set(MY_PROFILE.skills);
export const haveSkill = (id) => HAVE.has(id);
export const skillById = (id) => SKILLS.find((s) => s.id === id);
