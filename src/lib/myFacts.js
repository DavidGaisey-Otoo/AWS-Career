/**
 * myFacts.js — the facts a proposal is allowed to rest on.
 *
 * MY_PROFILE (myProfile.js) is what David holds, kept true in code. This
 * adds the freelance detail a proposal needs — certificate dates, rate,
 * hours, portfolio, client jobs finished, Upwork readiness — and lets the
 * app edit that detail without editing code.
 *
 * The truth check (truthCheck.js) reads only from here. Anything a
 * proposal claims that is not in these facts is flagged, so adding a fact
 * is the one deliberate way to make a claim pass. A certificate can only
 * be added with the date it was earned.
 *
 * Stored in the browser only (localStorage). Never sent anywhere.
 */
import { MY_PROFILE, SKILLS } from './myProfile.js';

/** Freelance detail as of 20 Nov 2026 (Upwork_Profile.md, AWS Portfolio README). */
export const DEFAULT_FACT_DETAIL = Object.freeze({
  certificateDates: {
    'aws-ccp': { earned: '2025-01', expires: '2028-01' },
    'ccsa': { earned: '2025-02', expires: '2027-02' },
  },
  extraCertificates: [],          // [{ id, name, earned, expires }] added in the app
  hourlyRate: 20,
  hoursPerWeek: 'Less than 30',
  clientJobsCompleted: 0,         // paid client jobs finished, on any platform
  upworkReviews: 0,
  portfolio: [
    { id: 'safe-start', title: 'Secure AWS Account Setup (MFA, IAM, Budgets, CloudTrail)', where: 'own training account' },
    { id: 'vpc-3-tier', title: 'Three-Tier AWS VPC Across Two Availability Zones', where: 'own training account' },
    { id: 'private-ec2', title: 'Private EC2 Servers Managed Without SSH', where: 'own training account' },
  ],
  upwork: {
    idVerified: false,            // costs 35 Connects; required before applying
    connectsBalance: 0,
    pricePerConnect: 0.15,        // USD, approximate; Upwork sets it
    twoStep: null,                // { on: true, checkedOn: 'YYYY-MM-DD' } once David confirms
  },
});

/** Every certificate the truth check knows how to recognise in text. */
export const KNOWN_CERTIFICATES = Object.freeze([
  { id: 'aws-ccp', name: 'AWS Certified Cloud Practitioner', re: /\bcloud\s+practitioner\b|\bCLF-C0\d\b/i },
  { id: 'aws-aip', name: 'AWS Certified AI Practitioner', re: /\bAI\s+practitioner\b|\bAIF-C0\d\b/i },
  { id: 'aws-saa', name: 'AWS Solutions Architect – Associate', re: /\bsolutions?\s+architect(?:\s*[-–]?\s*associate)?\b|\bSAA(?:-C0\d)?\b/i },
  { id: 'aws-sap', name: 'AWS Solutions Architect – Professional', re: /\bsolutions?\s+architect\s*[-–]?\s*professional\b|\bSAP-C0\d\b/i },
  { id: 'aws-dva', name: 'AWS Developer – Associate', re: /\bdeveloper\s*[-–]?\s*associate\b|\bDVA-C0\d\b/i },
  { id: 'aws-soa', name: 'AWS SysOps Administrator – Associate', re: /\bsys\s?ops\b|\bSOA-C0\d\b/i },
  { id: 'aws-dop', name: 'AWS DevOps Engineer – Professional', re: /\bdevops\s+engineer\s*[-–]?\s*professional\b|\bDOP-C0\d\b/i },
  { id: 'aws-scs', name: 'AWS Security – Specialty', re: /\bsecurity\s*[-–]?\s*specialty\b|\bSCS-C0\d\b/i },
  { id: 'aws-ans', name: 'AWS Advanced Networking – Specialty', re: /\badvanced\s+networking\b|\bANS-C0\d\b/i },
  { id: 'aws-dea', name: 'AWS Data Engineer – Associate', re: /\bdata\s+engineer\s*[-–]?\s*associate\b|\bDEA-C0\d\b/i },
  { id: 'aws-mla', name: 'AWS Machine Learning certification', re: /\bmachine\s+learning\s*[-–]?\s*(?:associate|specialty|engineer)\b|\bMLA-C0\d\b/i },
  { id: 'ccsa', name: 'Check Point CCSA R81', re: /\bCCSA\b|\bcheck\s?point\s+certified\s+security\s+administrator\b/i },
  { id: 'ccse', name: 'Check Point CCSE', re: /\bCCSE\b/i },
  { id: 'ccna', name: 'Cisco CCNA', re: /\bCCNA\b/i },
  { id: 'ccnp', name: 'Cisco CCNP', re: /\bCCNP\b/i },
  { id: 'comptia-sec', name: 'CompTIA Security+', re: /\bsecurity\+|\bsecurity\s+plus\b/i },
  { id: 'comptia-net', name: 'CompTIA Network+', re: /\bnetwork\+|\bnetwork\s+plus\b/i },
  { id: 'az-900', name: 'Microsoft Azure Fundamentals (AZ-900)', re: /\bAZ-900\b|\bazure\s+fundamentals\b/i },
  { id: 'az-104', name: 'Microsoft Azure Administrator (AZ-104)', re: /\bAZ-104\b|\bazure\s+administrator\b/i },
  { id: 'cka', name: 'Certified Kubernetes Administrator', re: /\bCKA\b|\bcertified\s+kubernetes\b/i },
  { id: 'terraform-assoc', name: 'HashiCorp Terraform Associate', re: /\bterraform\s+associate\b/i },
]);

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Merge MY_PROFILE with the editable detail. Pure.
 * @returns {{ certificates:[{id,name,earned,expires}], studying:[], skills:Set,
 *   yearsInIT:number, cloudYears:number, clientJobsCompleted:number, ... }}
 */
export function buildFacts(detail = {}, profile = MY_PROFILE) {
  const d = { ...DEFAULT_FACT_DETAIL, ...(detail || {}) };
  const dates = { ...DEFAULT_FACT_DETAIL.certificateDates, ...(d.certificateDates || {}) };
  const certificates = (profile.certificates || []).map((c) => ({ ...c, ...(dates[c.id] || {}) }));
  for (const extra of d.extraCertificates || []) {
    // A certificate only counts with the month it was earned.
    if (!extra?.id || !MONTH.test(String(extra.earned || ''))) continue;
    if (certificates.some((c) => c.id === extra.id)) continue;
    certificates.push({ id: extra.id, name: extra.name || certName(extra.id), earned: extra.earned, expires: extra.expires || null });
  }
  const held = new Set(certificates.map((c) => c.id));
  return {
    level: profile.level || 'entry',
    yearsInIT: Number(profile.yearsInIT) || 0,
    // Paid cloud work, in years. Zero until there is some — "7 years in
    // IT" is true; "7 years of AWS" is not.
    cloudYears: Number(d.cloudYears) || 0,
    certificates,
    studying: (profile.studying || []).filter((s) => !held.has(s.id)),
    skills: new Set(profile.skills || []),
    hourlyRate: Number(d.hourlyRate) || null,
    hoursPerWeek: d.hoursPerWeek || null,
    clientJobsCompleted: Math.max(0, Number(d.clientJobsCompleted) || 0),
    upworkReviews: Math.max(0, Number(d.upworkReviews) || 0),
    portfolio: Array.isArray(d.portfolio) ? d.portfolio : [],
    upwork: { ...DEFAULT_FACT_DETAIL.upwork, ...(d.upwork || {}) },
  };
}

export function certName(id) {
  return KNOWN_CERTIFICATES.find((c) => c.id === id)?.name || id;
}

export const holdsCert = (facts, id) => facts.certificates.some((c) => c.id === id);

/** Skills a post or proposal can name, with whether the facts hold them. */
export function skillStatus(facts) {
  return SKILLS.map((s) => ({ ...s, have: facts.skills.has(s.id) }));
}

/** Validate a certificate the user wants to add. Returns an error string or null. */
export function certificateProblem(cert, facts) {
  if (!cert?.id) return 'Pick which certificate it is.';
  if (!MONTH.test(String(cert.earned || ''))) return 'Add the month you earned it (YYYY-MM). A certificate without a date is not added.';
  if (holdsCert(facts, cert.id)) return 'That certificate is already in your facts.';
  return null;
}

/** Storage key suffix, under STORAGE_KEY. */
export const FACTS_KEY_SUFFIX = '::my-facts';
