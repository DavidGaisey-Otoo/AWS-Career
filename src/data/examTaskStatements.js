/**
 * Task-statement-level breakdown for every certification.
 *
 * Each cert in certs.js carries 3–6 domains. Each domain has 2–5 official
 * "task statements" published by AWS in the exam guide. We surface them
 * here so the user can drill at task-statement granularity (e.g. SAA-C03
 * Task 1.1 "Design secure access to AWS resources").
 *
 * Keyed by domain.id so the UI joins them on render. Domain ids match
 * the ones declared in certs.js.
 */

export const TASK_STATEMENTS = {
  // ------------------ Cloud Practitioner (CLF-C02) ------------------
  'clf-d1': [
    { id: 'clf-1.1', label: 'Define benefits of the AWS Cloud' },
    { id: 'clf-1.2', label: 'Identify design principles of the Cloud' },
    { id: 'clf-1.3', label: 'Understand migration strategies' },
  ],
  'clf-d2': [
    { id: 'clf-2.1', label: 'Understand the AWS shared responsibility model' },
    { id: 'clf-2.2', label: 'Identify AWS Cloud security, governance, compliance' },
    { id: 'clf-2.3', label: 'Identify access management capabilities' },
    { id: 'clf-2.4', label: 'Identify components and resources for security' },
  ],
  'clf-d3': [
    { id: 'clf-3.1', label: 'Define methods of deploying and operating in AWS' },
    { id: 'clf-3.2', label: 'Define the AWS global infrastructure' },
    { id: 'clf-3.3', label: 'Identify AWS compute services' },
    { id: 'clf-3.4', label: 'Identify AWS storage services' },
    { id: 'clf-3.5', label: 'Identify AWS database services' },
    { id: 'clf-3.6', label: 'Identify AWS network services' },
  ],
  'clf-d4': [
    { id: 'clf-4.1', label: 'Compare AWS pricing models' },
    { id: 'clf-4.2', label: 'Understand resources for billing, budget, cost' },
    { id: 'clf-4.3', label: 'Identify AWS technical support options' },
  ],

  // ------------------ Solutions Architect Associate (SAA-C03) ------------------
  'saa-d1': [
    { id: 'saa-1.1', label: 'Design secure access to AWS resources' },
    { id: 'saa-1.2', label: 'Design secure workloads and applications' },
    { id: 'saa-1.3', label: 'Determine appropriate data security controls' },
  ],
  'saa-d2': [
    { id: 'saa-2.1', label: 'Design scalable and loosely coupled architectures' },
    { id: 'saa-2.2', label: 'Design highly available and/or fault-tolerant architectures' },
  ],
  'saa-d3': [
    { id: 'saa-3.1', label: 'Determine high-performing storage solutions' },
    { id: 'saa-3.2', label: 'Design high-performing compute solutions' },
    { id: 'saa-3.3', label: 'Determine high-performing database solutions' },
    { id: 'saa-3.4', label: 'Determine high-performing network architectures' },
    { id: 'saa-3.5', label: 'Determine high-performing data ingestion + transformation' },
  ],
  'saa-d4': [
    { id: 'saa-4.1', label: 'Design cost-optimised storage' },
    { id: 'saa-4.2', label: 'Design cost-optimised compute' },
    { id: 'saa-4.3', label: 'Design cost-optimised database' },
    { id: 'saa-4.4', label: 'Design cost-optimised network architectures' },
  ],

  // ------------------ Developer Associate (DVA-C02) ------------------
  'dva-d1': [
    { id: 'dva-1.1', label: 'Develop code for applications hosted on AWS' },
    { id: 'dva-1.2', label: 'Develop code for AWS Lambda' },
    { id: 'dva-1.3', label: 'Use data stores in application development' },
  ],
  'dva-d2': [
    { id: 'dva-2.1', label: 'Implement authentication and/or authorisation' },
    { id: 'dva-2.2', label: 'Implement encryption using AWS services' },
    { id: 'dva-2.3', label: 'Manage sensitive data in application code' },
  ],
  'dva-d3': [
    { id: 'dva-3.1', label: 'Prepare application artefacts to be deployed to AWS' },
    { id: 'dva-3.2', label: 'Test applications in development environments' },
    { id: 'dva-3.3', label: 'Automate deployment testing' },
    { id: 'dva-3.4', label: 'Deploy code using CI/CD on AWS' },
  ],
  'dva-d4': [
    { id: 'dva-4.1', label: 'Assist in a root cause analysis' },
    { id: 'dva-4.2', label: 'Instrument code for observability' },
    { id: 'dva-4.3', label: 'Optimise applications using AWS services and features' },
  ],

  // ------------------ SysOps Administrator Associate (SOA-C02) ------------------
  'soa-d1': [
    { id: 'soa-1.1', label: 'Implement metrics, alarms, filters using AWS monitoring services' },
    { id: 'soa-1.2', label: 'Remediate issues based on monitoring and availability metrics' },
  ],
  'soa-d2': [
    { id: 'soa-2.1', label: 'Implement scalability and elasticity' },
    { id: 'soa-2.2', label: 'Implement high availability and resilient environments' },
    { id: 'soa-2.3', label: 'Implement backup and restore strategies' },
  ],
  'soa-d3': [
    { id: 'soa-3.1', label: 'Implement and optimise deployment strategies' },
    { id: 'soa-3.2', label: 'Implement automation using AWS services' },
  ],
  'soa-d4': [
    { id: 'soa-4.1', label: 'Implement and manage security and compliance policies' },
    { id: 'soa-4.2', label: 'Implement data and infrastructure protection strategies' },
  ],
  'soa-d5': [
    { id: 'soa-5.1', label: 'Implement networking features and connectivity' },
    { id: 'soa-5.2', label: 'Configure domains, DNS and content delivery' },
    { id: 'soa-5.3', label: 'Troubleshoot network connectivity' },
  ],
  'soa-d6': [
    { id: 'soa-6.1', label: 'Provision and maintain cloud resources' },
    { id: 'soa-6.2', label: 'Implement cost-optimisation strategies' },
  ],

  // ------------------ Data Engineer Associate (DEA-C01) ------------------
  'dea-d1': [
    { id: 'dea-1.1', label: 'Perform data ingestion' },
    { id: 'dea-1.2', label: 'Transform and process data' },
    { id: 'dea-1.3', label: 'Orchestrate data pipelines' },
    { id: 'dea-1.4', label: 'Apply programming concepts' },
  ],
  'dea-d2': [
    { id: 'dea-2.1', label: 'Choose a data store' },
    { id: 'dea-2.2', label: 'Understand data cataloguing systems' },
    { id: 'dea-2.3', label: 'Manage the lifecycle of data' },
    { id: 'dea-2.4', label: 'Design data models and schema evolution' },
  ],
  'dea-d3': [
    { id: 'dea-3.1', label: 'Automate data pipelines' },
    { id: 'dea-3.2', label: 'Analyse data and prepare it for analysis' },
    { id: 'dea-3.3', label: 'Maintain and monitor data pipelines' },
    { id: 'dea-3.4', label: 'Ensure data quality' },
  ],
  'dea-d4': [
    { id: 'dea-4.1', label: 'Apply authentication mechanisms' },
    { id: 'dea-4.2', label: 'Apply authorisation mechanisms' },
    { id: 'dea-4.3', label: 'Ensure data encryption and masking' },
    { id: 'dea-4.4', label: 'Prepare logs for audit' },
    { id: 'dea-4.5', label: 'Understand data privacy and governance' },
  ],

  // ------------------ ML Associate (MLA-C01) ------------------
  'mla-d1': [
    { id: 'mla-1.1', label: 'Ingest and store data' },
    { id: 'mla-1.2', label: 'Transform data and perform feature engineering' },
    { id: 'mla-1.3', label: 'Ensure data integrity and prepare data for modelling' },
  ],
  'mla-d2': [
    { id: 'mla-2.1', label: 'Choose a modelling approach' },
    { id: 'mla-2.2', label: 'Train and refine models' },
    { id: 'mla-2.3', label: 'Analyse model performance' },
  ],
  'mla-d3': [
    { id: 'mla-3.1', label: 'Select deployment infrastructure' },
    { id: 'mla-3.2', label: 'Create and script infrastructure' },
    { id: 'mla-3.3', label: 'Use auto-scaling and CI/CD for ML' },
  ],
  'mla-d4': [
    { id: 'mla-4.1', label: 'Monitor model performance and data quality' },
    { id: 'mla-4.2', label: 'Monitor and optimise infrastructure and costs' },
    { id: 'mla-4.3', label: 'Secure AWS resources' },
  ],

  // ------------------ Solutions Architect Professional (SAP-C02) ------------------
  'sap-d1': [
    { id: 'sap-1.1', label: 'Architect organisational complexity (multi-account)' },
    { id: 'sap-1.2', label: 'Architect cross-account authentication and access' },
    { id: 'sap-1.3', label: 'Architect networking connectivity' },
  ],
  'sap-d2': [
    { id: 'sap-2.1', label: 'Design solutions integrating multiple AWS services' },
    { id: 'sap-2.2', label: 'Determine security requirements and controls' },
    { id: 'sap-2.3', label: 'Determine reliability and resilience design' },
    { id: 'sap-2.4', label: 'Determine performance design' },
  ],
  'sap-d3': [
    { id: 'sap-3.1', label: 'Determine appropriate migration strategy' },
    { id: 'sap-3.2', label: 'Determine new architecture for existing workloads' },
    { id: 'sap-3.3', label: 'Determine modernisation and enhancement opportunities' },
  ],
  'sap-d4': [
    { id: 'sap-4.1', label: 'Apply cost optimisation' },
    { id: 'sap-4.2', label: 'Apply operational excellence' },
  ],

  // ------------------ DevOps Engineer Professional (DOP-C02) ------------------
  'dop-d1': [
    { id: 'dop-1.1', label: 'Implement CI/CD pipelines' },
    { id: 'dop-1.2', label: 'Integrate automated testing into pipelines' },
    { id: 'dop-1.3', label: 'Build artefacts using AWS services' },
    { id: 'dop-1.4', label: 'Implement deployment strategies' },
  ],
  'dop-d2': [
    { id: 'dop-2.1', label: 'Implement infrastructure as code' },
    { id: 'dop-2.2', label: 'Implement configuration management' },
    { id: 'dop-2.3', label: 'Automate operational tasks' },
  ],
  'dop-d3': [
    { id: 'dop-3.1', label: 'Implement logging solutions' },
    { id: 'dop-3.2', label: 'Implement monitoring and event management' },
    { id: 'dop-3.3', label: 'Audit, log and monitor operating systems and infrastructure' },
  ],
  'dop-d4': [
    { id: 'dop-4.1', label: 'Implement automation for high availability' },
    { id: 'dop-4.2', label: 'Implement automation for performance and scaling' },
  ],
  'dop-d5': [
    { id: 'dop-5.1', label: 'Implement security controls and validation' },
    { id: 'dop-5.2', label: 'Implement data protection' },
  ],
  'dop-d6': [
    { id: 'dop-6.1', label: 'Implement event-driven incident response' },
    { id: 'dop-6.2', label: 'Implement fault-tolerant workloads' },
    { id: 'dop-6.3', label: 'Implement disaster recovery strategies' },
  ],

  // ------------------ Security Specialty (SCS-C02) ------------------
  'scs-d1': [
    { id: 'scs-1.1', label: 'Design and implement an incident response plan' },
    { id: 'scs-1.2', label: 'Detect security events using AWS services' },
    { id: 'scs-1.3', label: 'Respond to compromised resources and workloads' },
  ],
  'scs-d2': [
    { id: 'scs-2.1', label: 'Design and implement monitoring and alerting' },
    { id: 'scs-2.2', label: 'Troubleshoot security monitoring' },
    { id: 'scs-2.3', label: 'Design + implement a logging solution' },
    { id: 'scs-2.4', label: 'Troubleshoot logging' },
  ],
  'scs-d3': [
    { id: 'scs-3.1', label: 'Design + implement edge security' },
    { id: 'scs-3.2', label: 'Design + implement network controls' },
    { id: 'scs-3.3', label: 'Design + implement security for compute' },
  ],
  'scs-d4': [
    { id: 'scs-4.1', label: 'Design, implement and troubleshoot authentication' },
    { id: 'scs-4.2', label: 'Design, implement and troubleshoot authorisation' },
  ],
  'scs-d5': [
    { id: 'scs-5.1', label: 'Design + implement controls for data at rest' },
    { id: 'scs-5.2', label: 'Design + implement controls for data in transit' },
  ],
  'scs-d6': [
    { id: 'scs-6.1', label: 'Develop a strategy to centrally deploy security services' },
    { id: 'scs-6.2', label: 'Determine compliance and assurance' },
  ],

  // ------------------ Advanced Networking Specialty (ANS-C01) ------------------
  'ans-d1': [
    { id: 'ans-1.1', label: 'Apply network design principles' },
    { id: 'ans-1.2', label: 'Design DNS solutions' },
    { id: 'ans-1.3', label: 'Design and connect global networks' },
  ],
  'ans-d2': [
    { id: 'ans-2.1', label: 'Implement hybrid connectivity' },
    { id: 'ans-2.2', label: 'Implement routing for AWS networks' },
    { id: 'ans-2.3', label: 'Implement managed networking services' },
  ],
  'ans-d3': [
    { id: 'ans-3.1', label: 'Maintain network routing and connectivity' },
    { id: 'ans-3.2', label: 'Monitor and analyse network traffic' },
    { id: 'ans-3.3', label: 'Optimise network performance' },
  ],
  'ans-d4': [
    { id: 'ans-4.1', label: 'Implement network access security' },
    { id: 'ans-4.2', label: 'Implement network edge security' },
    { id: 'ans-4.3', label: 'Implement data encryption in flight' },
  ],
  'ans-d5': [
    { id: 'ans-5.1', label: 'Manage, automate, troubleshoot network capacity' },
    { id: 'ans-5.2', label: 'Apply automation tools and patterns' },
  ],

  // ------------------ Database Specialty (DBS-C01) ------------------
  'dbs-d1': [
    { id: 'dbs-1.1', label: 'Select appropriate database services' },
    { id: 'dbs-1.2', label: 'Determine strategies for disaster recovery' },
    { id: 'dbs-1.3', label: 'Compare and contrast database solutions' },
  ],
  'dbs-d2': [
    { id: 'dbs-2.1', label: 'Automate database solution deployments' },
    { id: 'dbs-2.2', label: 'Provision databases and manage capacity' },
  ],
  'dbs-d3': [
    { id: 'dbs-3.1', label: 'Determine maintenance tasks and processes' },
    { id: 'dbs-3.2', label: 'Determine backup and restore strategies' },
    { id: 'dbs-3.3', label: 'Manage operational environment' },
  ],
  'dbs-d4': [
    { id: 'dbs-4.1', label: 'Determine monitoring and alerting strategies' },
    { id: 'dbs-4.2', label: 'Troubleshoot and resolve common database issues' },
    { id: 'dbs-4.3', label: 'Optimise database performance' },
  ],
  'dbs-d5': [
    { id: 'dbs-5.1', label: 'Encrypt data at rest and in transit' },
    { id: 'dbs-5.2', label: 'Evaluate auditing solutions' },
    { id: 'dbs-5.3', label: 'Determine access control and authentication mechanisms' },
  ],

  // ------------------ ML Specialty (MLS-C01) ------------------
  'mls-d1': [
    { id: 'mls-1.1', label: 'Select and justify data sources' },
    { id: 'mls-1.2', label: 'Identify and implement data ingestion solutions' },
    { id: 'mls-1.3', label: 'Identify data transformation solutions' },
  ],
  'mls-d2': [
    { id: 'mls-2.1', label: 'Sanitise and prepare data for modelling' },
    { id: 'mls-2.2', label: 'Perform feature engineering' },
    { id: 'mls-2.3', label: 'Analyse and visualise data' },
  ],
  'mls-d3': [
    { id: 'mls-3.1', label: 'Frame business problems as ML problems' },
    { id: 'mls-3.2', label: 'Select an appropriate model' },
    { id: 'mls-3.3', label: 'Train ML models' },
    { id: 'mls-3.4', label: 'Hyper-parameter optimisation' },
    { id: 'mls-3.5', label: 'Evaluate models' },
  ],
  'mls-d4': [
    { id: 'mls-4.1', label: 'Build solutions using AWS ML services' },
    { id: 'mls-4.2', label: 'Apply best practices for deployment + operations' },
  ],

  // ------------------ AI Practitioner (AIF-C01) ------------------
  'aif-d1': [
    { id: 'aif-1.1', label: 'Explain basic AI concepts and terminologies' },
    { id: 'aif-1.2', label: 'Identify practical use cases for AI' },
    { id: 'aif-1.3', label: 'Describe the ML development lifecycle' },
  ],
  'aif-d2': [
    { id: 'aif-2.1', label: 'Explain the basic concepts of generative AI' },
    { id: 'aif-2.2', label: 'Understand capabilities + limitations of GenAI' },
    { id: 'aif-2.3', label: 'Describe AWS infrastructure and services for GenAI' },
  ],
  'aif-d3': [
    { id: 'aif-3.1', label: 'Describe design considerations for using foundation models' },
    { id: 'aif-3.2', label: 'Choose effective prompt engineering techniques' },
    { id: 'aif-3.3', label: 'Describe customising a foundation model' },
  ],
  'aif-d4': [
    { id: 'aif-4.1', label: 'Explain responsible AI development' },
    { id: 'aif-4.2', label: 'Recognise legal and ethical considerations' },
  ],
  'aif-d5': [
    { id: 'aif-5.1', label: 'Explain methods to secure AI systems' },
    { id: 'aif-5.2', label: 'Recognise governance + compliance regulations for AI' },
  ],
};

/** Return all task statements for a cert (joined across its domains). */
export function taskStatementsForCert(cert) {
  if (!cert) return [];
  const out = [];
  for (const dom of cert.domains) {
    const list = TASK_STATEMENTS[dom.id] || [];
    for (const t of list) out.push({ ...t, domainId: dom.id, domainLabel: dom.label, domainWeight: dom.weight });
  }
  return out;
}
