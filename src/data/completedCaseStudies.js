export const COMPLETED_CASE_STUDIES = [
  {
    id: 'aws-static-hosting-lifecycle-2026',
    title: 'AWS Static Application Hosting — Deploy, Validate and Teardown',
    category: 'Work',
    completedAt: '2026-09-12',
    summary: 'Deployed a Vite single-page application to private Amazon S3 behind CloudFront, validated SPA routing, then removed every AWS hosting resource after a cost review.',
    markdown: `# AWS Static Application Hosting — Deploy, Validate and Teardown

## Project status
Completed and safely decommissioned on 12 September 2026. No AWS hosting resources from this project remain.

## Objective
Publish the AWS Career Launchpad Pro single-page application through AWS, keep the S3 origin private, provide HTTPS through CloudFront, verify client-side routes, collect implementation evidence, and perform a complete teardown when guaranteed-zero-cost hosting could not be confirmed.

## Architecture
User browser → Amazon CloudFront (HTTPS/CDN) → private Amazon S3 origin → index.html and versioned application assets.

CloudFront Origin Access Control restricted direct access to the S3 origin. The distribution used index.html as its default root object. Custom 403 and 404 responses returned /index.html with HTTP 200 so React routes could load directly.

## Implementation performed
1. Built the Vite production bundle locally.
2. Created a general-purpose S3 bucket in Europe (Stockholm), eu-north-1.
3. Retained S3 Block Public Access and default encryption.
4. Applied Project, Environment and Owner tags.
5. Uploaded the contents of dist so index.html was at the bucket root and compiled files were under assets/.
6. Created a CloudFront distribution with the S3 bucket as its private origin.
7. Granted CloudFront access to the origin through the generated bucket policy.
8. Configured index.html as the default root object.
9. Added custom error responses for 403 and 404 to /index.html with response code 200 and minimum TTL 0.
10. Verified both the root URL and a direct /solution route in a browser.

## Validation evidence
- S3 upload result: 183 objects uploaded successfully, 0 failures, approximately 6.4 MB.
- CloudFront distribution creation completed successfully.
- The application rendered from the CloudFront domain over HTTPS.
- Direct navigation to /solution rendered the SPA after the error-response configuration.
- Final CloudFront inventory showed 0 distributions after teardown.
- Final S3 inventory showed 0 buckets after teardown.

## Cost and security decision
The distribution was created under pay-as-you-go billing. Free allowances or account credits can reduce the amount charged, but they do not prove that usage is inherently costless. Because the project requirement changed to guaranteed zero ongoing AWS hosting cost, the deployment was decommissioned. No access keys, secret keys, session tokens, passwords or MFA secrets belong in this case study.

## Teardown performed
1. Disabled the CloudFront distribution and waited for the change to deploy.
2. Deleted the disabled CloudFront distribution.
3. Emptied the versioned S3 bucket, including all object versions and delete markers.
4. Confirmed 183 objects deleted and 0 failures.
5. Deleted the empty S3 bucket.
6. Confirmed CloudFront distributions: 0 and S3 buckets: 0.

## Result
The project demonstrates production build handling, private-origin design, CDN delivery, SPA routing, verification, cost governance, and complete lifecycle cleanup. The source application remains published through GitHub Pages and the AWS deployment can be reproduced later only after an approved cost plan.

## Lessons learned
- Upload the contents of dist, not a parent dist folder, so index.html is at the origin root.
- A private S3 origin with CloudFront access control is safer than a publicly readable website bucket.
- SPA deep links require an index.html fallback for 403 and 404 responses.
- “Free Tier eligible” and account credits are not the same as a guaranteed-zero-cost architecture.
- Every portfolio deployment needs a tested teardown and final empty-resource screenshots.

## Portfolio statement
Designed and deployed a secure AWS static-application delivery path using Amazon S3 and CloudFront, configured private origin access and SPA routing, validated the live application, assessed billing exposure, and completed a verified teardown with zero remaining CloudFront distributions and S3 buckets.
`,
  },
];

export const ASSESSMENT_DOCUMENTS = [
  {
    id: 'iam-assessment-dossier',
    title: 'AWS Identity and Account Security Assessment',
    description: 'Proposal, scope agreement, architecture, project plan, console runbook, test matrix, screenshot standard, findings form, AI verification and portfolio handover.',
    file: 'documents/David-Gaisey-Otoo-AWS-Identity-and-Account-Security-Assessment.docx',
    category: 'Work',
    status: 'Ready for evidence',
  },
  {
    id: 'iam-assessment-challenges',
    title: 'AWS Assessment Challenges and Improvements',
    description: 'Private working register for defects, limitations, decisions, future improvements and retest evidence. Keep separate from the public portfolio.',
    file: null,
    localPath: 'documentation\\David Gaisey-Otoo AWS Assessment Challenges and Improvements.docx',
    category: 'Personal',
    status: 'Private local register',
  },
];
