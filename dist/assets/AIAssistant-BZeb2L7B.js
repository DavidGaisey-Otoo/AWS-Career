import{bC as z,a6 as N,cf as j,cy as D,cr as B,ca as p,c2 as n,aj as G,F as M,aG as F,p as S,bB as w,b9 as E,j as _,c5 as O,o as U,bp as q}from"./index-DjRQ3k0P.js";import{M as V,C as H}from"./Markdown-BY0VWiak.js";import{T as Q}from"./TypingDots-Dow2j1VI.js";import{S as Z}from"./send-D2DzKaH6.js";/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y=z("Eraser",[["path",{d:"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21",key:"182aya"}],["path",{d:"M22 21H7",key:"t4ddhn"}],["path",{d:"m5 11 9 9",key:"1mo9qw"}]]),g={s3:{name:"Amazon S3",simple:"Object storage that scales to infinity. You upload files (objects) into buckets. Pay per GB-month + requests.",deep:"S3 stores objects, not blocks. Default 11-nines durability across 3+ AZs. Six storage classes from Standard (hot) down to Glacier Deep Archive (cold).",pros:["11-nines durability","Infinite scale","Lifecycle to cheap tiers","Static website hosting"],cons:["Per-request cost adds up at high TPS","List operations are eventually-consistent-ordered"],whenToUse:"Anything you'd store as a file: backups, media, logs, static sites, data lake objects."},ec2:{name:"Amazon EC2",simple:"Virtual machines you rent by the second. Pick a size, pick an OS, click launch.",deep:"Instance families: T (burstable), M (general), C (compute), R (memory), G/P (GPU). Storage: EBS (persistent) or instance store (ephemeral). Stateful firewalls (SGs).",pros:["Full OS control","Huge instance variety","Spot Instances save 90%"],cons:["You patch the OS","Wasted capacity when idle","Operational overhead vs serverless"],whenToUse:"Long-running workloads, legacy apps, anything needing OS-level control."},lambda:{name:"AWS Lambda",simple:"Run code without managing servers. Pay only for execution time.",deep:"Functions trigger on events (HTTP, S3, SQS, EventBridge, DynamoDB Streams). 15-min max execution, up to 10 GB memory. Memory ↔ CPU is proportional.",pros:["No servers","Scales 0 → 1000s in seconds","Pay only when invoked","1M req/mo free"],cons:["Cold starts (~100-1000ms first call)","15-minute hard cap","Distributed debugging is harder"],whenToUse:"APIs with spiky traffic, event processing, glue code between services."},dynamodb:{name:"Amazon DynamoDB",simple:"Managed NoSQL with single-digit-ms latency at any scale.",deep:"Key-value + document model. Partition key + optional sort key. GSIs for secondary access patterns. Streams for change capture.",pros:["Single-digit-ms reads anywhere","Scales to millions of TPS","Pay-per-request mode"],cons:["No joins","Schema must match access patterns","400KB item size limit"],whenToUse:"High-scale, low-latency key-value or document workloads. Sessions, cart, IoT, gaming."},rds:{name:"Amazon RDS",simple:"Managed relational database. AWS handles patching, backups, failover.",deep:"Engines: MySQL, Postgres, MariaDB, Oracle, SQL Server, Aurora. Multi-AZ = synchronous standby. Read Replicas = async, up to 15.",pros:["Fully managed","Automated backups + PITR (35 days)","Multi-AZ failover in 60-120s"],cons:["Cap on max instance size","You manage schema + queries","Standby is not readable"],whenToUse:"Anything that needs ACID transactions and a relational model."},vpc:{name:"Amazon VPC",simple:"Your own private network on AWS. Subnets, routing, gateways — like your own data center.",deep:"Region-scoped CIDR. Public subnets route to IGW. Private subnets route through NAT. Security Groups (stateful) + NACLs (stateless) for defense in depth.",pros:["Total network control","Multi-AZ design","Integrates with on-prem via VPN/DX"],cons:["NAT Gateway ~$32/mo per AZ","CIDR planning errors are painful to undo"],whenToUse:"Always. Every workload runs in a VPC, the question is just whose."},cloudfront:{name:"Amazon CloudFront",simple:"Global CDN. Caches your content at 400+ edge locations close to users.",deep:"Distribution with one or more Origins + Behaviors (path-pattern caching rules). Origin Access Control locks S3 to CloudFront. Signed URLs gate access.",pros:["Sub-100ms latency worldwide","Cheap at scale (TB pricing)","Origin Shield boosts hit rate"],cons:["Cache invalidations cost after first 1000/mo","TLS cert must be in us-east-1"],whenToUse:"Static sites, media, API caching, anywhere global latency matters."},iam:{name:"AWS IAM",simple:"Access control. Users + roles + policies decide who can do what.",deep:"Identity policies (on users/groups/roles) and resource policies (on S3/KMS/SNS) combine. Explicit DENY > ALLOW > implicit DENY. SCPs cap permissions.",pros:["Free","Fine-grained","Temporary creds via STS"],cons:["Eventually consistent","Easy to over-grant","Wildcards are tempting and wrong"],whenToUse:"Always. Every action in AWS goes through IAM evaluation."}},K={"s3-bucket-tf":`# Terraform: private S3 bucket with versioning + default encryption
resource "aws_s3_bucket" "site" {
  bucket = "lab-\${random_id.s.hex}"
}

resource "random_id" "s" { byte_length = 4 }

resource "aws_s3_bucket_versioning" "v" {
  bucket = aws_s3_bucket.site.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "e" {
  bucket = aws_s3_bucket.site.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

resource "aws_s3_bucket_public_access_block" "bpa" {
  bucket = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`,"lambda-tf":`# Terraform: Lambda function with IAM role
data "archive_file" "z" {
  type        = "zip"
  source_file = "handler.js"
  output_path = "handler.zip"
}

resource "aws_iam_role" "fn" {
  name = "fn-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.fn.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "fn" {
  function_name    = "hello"
  filename         = data.archive_file.z.output_path
  source_code_hash = data.archive_file.z.output_base64sha256
  handler          = "handler.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.fn.arn
  memory_size      = 256
  timeout          = 10
}`,"s3-bucket-cfn":`# CloudFormation: private S3 bucket
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true`},J=[{match:/s3.*ls|list.*bucket/i,cmd:"aws s3 ls",explain:"Lists all S3 buckets in your account."},{match:/list.*ec2|ec2.*list|describe.*instance/i,cmd:'aws ec2 describe-instances --query "Reservations[].Instances[].[InstanceId,State.Name,InstanceType]" --output table',explain:"Lists every EC2 instance with id, state, and type."},{match:/assume.*role|sts.*assume/i,cmd:"aws sts assume-role --role-arn arn:aws:iam::123:role/foo --role-session-name local",explain:"Returns temporary credentials by assuming the named role."},{match:/upload.*s3|cp.*s3/i,cmd:"aws s3 cp ./file.txt s3://my-bucket/path/",explain:"Uploads a single file to S3. Add --recursive for directories."},{match:/invoke.*lambda/i,cmd:`aws lambda invoke --function-name hello --payload '{"x":1}' out.json`,explain:"Invokes a Lambda synchronously and writes the response body to out.json."}];function X(s){const e=(s||"").toLowerCase().trim();if(!e)return{intent:"greet"};const t=ee(e),a=te(e);return/^(hi|hey|hello|yo)\b/.test(e)?{intent:"greet"}:/compare|vs\.?|versus|difference/.test(e)&&a.length>=2?{intent:"compare",payload:{a:a[0],b:a[1]}}:/flashcard|cards? on|quiz me|create.*card/.test(e)?{intent:"flashcards",payload:{service:t,topic:e}}:/practice|test me|generate.*question/.test(e)?{intent:"practice",payload:{service:t,topic:e}}:/summari[sz]e|tldr|key point|whitepaper/.test(e)?{intent:"summarize",payload:{topic:e}}:/terraform|tf|hcl/.test(e)&&t?{intent:"iac",payload:{tool:"terraform",service:t}}:/cloudformation|cfn|yaml template/.test(e)&&t?{intent:"iac",payload:{tool:"cloudformation",service:t}}:/aws.*cli|cli.*command|aws cli/.test(e)?{intent:"cli",payload:{topic:e}}:/error|fail|broken|won'?t work|stuck|debug|why .* not/.test(e)?{intent:"troubleshoot",payload:{service:t,topic:e}}:/review.*architecture|architecture.*review|design review|critique/.test(e)?{intent:"arch-review",payload:{topic:e}}:/study plan|schedule|prepare for|how (do|should) i (study|prep)/.test(e)?{intent:"study-plan",payload:{topic:e}}:/what should i study|today|next|recommend/.test(e)?{intent:"recommend",payload:{topic:e}}:/explain|what is|how does|simply|simple english/.test(e)||t?{intent:"explain",payload:{service:t,topic:e}}:{intent:"general",payload:{topic:e}}}function ee(s){const e=["lambda","ec2","vpc","dynamodb","cloudfront","rds","iam","s3"];for(const t of e)if(new RegExp(`\\b${t}\\b`,"i").test(s))return t;return null}function te(s){const e=["lambda","ec2","vpc","dynamodb","cloudfront","rds","iam","s3","aurora","ecs","eks","sqs","sns","eventbridge"],t=[];for(const a of e)new RegExp(`\\b${a}\\b`,"i").test(s)&&!t.includes(a)&&t.push(a);return t}const u={explain:["Tell me when to use this vs alternatives","Show me Terraform for this","Quiz me on it"],compare:["Show me a decision tree","Pick one for a startup","Pick one for an enterprise"],flashcards:["Make 5 more on the harder edges","Quiz me on these"],practice:["Explain the last one in more depth","Give me 5 more","Make them harder"],summarize:["Summarize it for an exam","What are the 3 must-knows?"],iac:["Add a Multi-AZ variant","Add cost-saving defaults","Add an output for the endpoint"],cli:["How do I script this in a loop?","How do I do this in boto3?"],troubleshoot:["What logs should I check first?","Give me a checklist"],"arch-review":["Flag the cost risks","Suggest a Well-Architected fix"],"study-plan":["Account for 3 hours per day","Bias the plan to networking"],recommend:["Show me today's lesson","Open the practice exam"],general:["Explain it more simply","Compare alternatives"],greet:["Quiz me on Solutions Architect topics","What should I study today?","Explain VPC to me simply"]};function se({intent:s,payload:e={}}){switch(s){case"greet":return ne();case"explain":return ae(e.service,e.topic);case"compare":return oe(e.a,e.b);case"flashcards":return re(e.service,e.topic);case"practice":return ce(e.service,e.topic);case"summarize":return le(e.topic);case"iac":return ue(e.tool,e.service);case"cli":return de(e.topic);case"troubleshoot":return me(e.service,e.topic);case"arch-review":return pe(e.topic);case"study-plan":return he(e.topic);case"recommend":return fe();default:return ge(e.topic)}}function ne(){return{text:`Hey! I'm your AWS study assistant.

I can explain services simply, generate practice questions on any topic, walk through architecture trade-offs, write Terraform, and summarize whitepapers.

Pick one of the suggested questions below, or just ask me anything AWS.`,suggestions:u.greet,links:[]}}function ae(s,e){const t=s?g[s]:null;if(!t)return{text:`Sure — to explain ${e||"an AWS service"} crisply, I need a service name (S3, EC2, Lambda, VPC, RDS, DynamoDB, CloudFront, IAM…).

Try "explain S3 simply" or "what is Lambda".`,suggestions:["Explain S3 simply","What is Lambda","Explain VPC"]};const a=`**${t.name}** in one line: ${t.simple}

**Under the hood:** ${t.deep}

**Strengths**
${t.pros.map(o=>`• ${o}`).join(`
`)}

**Trade-offs**
${t.cons.map(o=>`• ${o}`).join(`
`)}

**When to reach for it:** ${t.whenToUse}`,l=be(s);return{text:a,suggestions:u.explain,links:l}}function oe(s,e){var o,r;const t=g[s]||{name:s},a=g[e]||{name:e};return{text:`**${t.name} vs ${a.name}**

| | ${t.name} | ${a.name} |
| --- | --- | --- |
| One-liner | ${t.simple||"—"} | ${a.simple||"—"} |
| Use when  | ${t.whenToUse||"—"} | ${a.whenToUse||"—"} |
| Watch out | ${((o=t.cons)==null?void 0:o[0])||"—"} | ${((r=a.cons)==null?void 0:r[0])||"—"} |

**Rule of thumb:** start with ${t.name} when you need ${I(t)}. Reach for ${a.name} when ${I(a)}.`,suggestions:u.compare}}function I(s){return(s.whenToUse||"the canonical case for it").toLowerCase().replace(/\.$/,"")}function re(s,e){var o;const t=s?g[s]:null,a=t?[{front:`What is ${t.name}?`,back:t.simple},{front:`Best use case for ${t.name}?`,back:t.whenToUse},{front:`Biggest trade-off of ${t.name}?`,back:((o=t.cons)==null?void 0:o[0])||"—"},{front:`${t.name} pricing model?`,back:ie(s)}]:[{front:"What's in a VPC by default?",back:"A default route table, NACL, security group, and (in default VPCs) one subnet per AZ."},{front:"Difference between SG and NACL?",back:"SG is stateful, instance-level, allow-only. NACL is stateless, subnet-level, supports DENY."},{front:"What's the S3 durability number?",back:"11 nines (99.999999999%) across 3+ AZs."},{front:"Lambda max execution?",back:"15 minutes per invocation."}];return{text:`Here are flashcards on ${(t==null?void 0:t.name)||e||"this topic"}:

${a.map((r,c)=>`**${c+1}. ${r.front}**
${r.back}`).join(`

`)}

Want me to make 5 more on harder edges, or quiz you?`,suggestions:u.flashcards}}function ie(s){return{s3:"Per GB-month + per-request + egress.",ec2:"Per second (60s min). Spot saves up to 90%; Savings Plans up to 72%.",lambda:"Per request + per-GB-second.",dynamodb:"On-demand: per request. Provisioned: per RCU/WCU.",rds:"Per hour by instance class + storage GB-month.",cloudfront:"Per GB egress (~$0.085/GB in NA/EU) + per-request.",vpc:"Free; NAT Gateway ~$0.045/hr + $0.045/GB.",iam:"Free."}[s]||"Pay-as-you-go by resource."}function ce(s,e){var l;const t=s==="s3"?[{q:"You need to serve a static site globally with HTTPS on a custom domain. Cheapest production-grade setup?",opts:["S3 in every region","S3 + CloudFront + ACM (us-east-1)","EC2 nginx in 3 regions","Lightsail"],a:1,why:"One S3 origin + CloudFront caches at 400+ edges. ACM must live in us-east-1 for CloudFront."},{q:"Which S3 class is cheapest with millisecond retrieval?",opts:["Standard","Glacier Instant Retrieval","Glacier Deep Archive","One Zone-IA"],a:1,why:"Glacier Instant Retrieval is archival pricing with millisecond access."}]:[{q:"A Lambda processing SQS messages must handle duplicates. Best mitigation?",opts:["Increase concurrency","Make the handler idempotent","Disable retries","Switch to EventBridge"],a:1,why:"SQS is at-least-once. Idempotent handlers absorb duplicates safely."},{q:"Which is true about NAT Gateways?",opts:["Allow inbound from internet","Are placed in private subnets","Enable outbound from private + live in a public subnet","Are free"],a:2,why:"NAT lives in a public subnet, lets private subnets initiate egress, costs hourly + per GB."}];return{text:`Practice quiz on ${((l=g[s])==null?void 0:l.name)||e||"AWS"}:

`+t.map((o,r)=>`**Q${r+1}. ${o.q}**
${o.opts.map((c,d)=>`${String.fromCharCode(65+d)}. ${c}`).join(`
`)}

_Answer: ${String.fromCharCode(65+o.a)} — ${o.why}_`).join(`

`),suggestions:u.practice}}function le(s){return{text:`Here's a 6-bullet summary:

• **Goal:** what the doc is trying to achieve.
• **Pattern:** the canonical AWS-recommended way.
• **Pitfall #1:** the misconception that bites teams most often.
• **Pitfall #2:** the cost trap.
• **Operational note:** the runbook implication.
• **Exam relevance:** what an exam writer is likely to pull from this.

Paste the whitepaper title or topic and I'll tailor this to the specific source.`,suggestions:u.summarize}}function ue(s,e){const t={"s3-tf":"s3-bucket-tf","s3-cfn":"s3-bucket-cfn","lambda-tf":"lambda-tf"}[`${e}-${s==="cloudformation"?"cfn":"tf"}`],a=t?K[t]:null;return a?{text:`Here's a production-grade ${s==="cloudformation"?"CloudFormation":"Terraform"} snippet:

\`\`\`${s==="cloudformation"?"yaml":"hcl"}
${a}
\`\`\`

Notes:
• Block Public Access is on by default since 2023 — verified above.
• Versioning is essential for accidental-delete recovery.
• SSE-S3 (AES256) is the no-cost default; switch to SSE-KMS for compliance.`,suggestions:u.iac}:{text:`I've got templates for S3 (Terraform + CloudFormation) and Lambda (Terraform). For ${e||"this service"} in ${s}, try the AWS Provider docs or terraform-aws-modules.

Ask "Terraform for S3" or "CloudFormation for S3 bucket" to see a working snippet.`,suggestions:["Terraform for S3","CloudFormation for S3 bucket","Terraform for Lambda"]}}function de(s){const e=J.find(t=>t.match.test(s));return e?{text:`\`\`\`bash
${e.cmd}
\`\`\`

${e.explain}

Tip: every AWS CLI command supports \`--query\` for JMESPath filtering and \`--output table\` for human-readable output.`,suggestions:u.cli}:{text:`I have CLI snippets for: listing buckets, listing EC2, STS assume-role, uploading to S3, invoking Lambda.

Tell me what you want to do and I'll give you the exact command — e.g. "list all my EC2 instances" or "upload a folder to S3".`,suggestions:["List all my EC2 instances","Upload a folder to S3","Invoke a Lambda from CLI"]}}function me(s,e){var o;const a=s&&{s3:["Block Public Access turned on but you expected the bucket public","Cross-account: bucket policy missing the principal","CloudFront caching the failure — invalidate /path","Wrong region for ACM cert (CloudFront needs us-east-1)"],ec2:["Security Group: did you allow port + source IP?","SSH key permissions: chmod 400 your-key.pem","Subnet has no internet route (private subnet?)","Did you allocate an Elastic IP for stable public IP?"],lambda:["IAM role lacks the action — check Policy Simulator","Cold start vs timeout — increase memory or move heavy imports to module scope","Response > 6MB sync limit — switch to async or stream","VPC-attached Lambda needs NAT for internet"],vpc:["Route table missing default route to IGW (public) or NAT (private)","NACL rule missing the ephemeral port range (32768-65535)","Overlapping CIDRs — peering won't work","NAT in wrong subnet — must be in a public subnet with IGW route"],rds:["Security Group: DB SG must allow the app SG","Endpoint resolves only inside the VPC — bastion or VPN to test from laptop","Encryption enabled? Cannot enable after creation","Default port — Postgres 5432, MySQL 3306"],iam:["Explicit DENY in another policy or SCP","Missing condition like aws:SecureTransport","STS assume-role needs sts:AssumeRole + trust policy on the role","Eventually consistent — wait a few seconds after attaching a policy"]}[s]||["Read the CloudTrail event — it shows the exact API call + error","Compare with a known-working environment","Check IAM via the Policy Simulator","Check the SG + NACL + route table","Confirm the resource exists in the region you're calling"];return{text:`Here's the troubleshoot checklist${s?` for ${((o=g[s])==null?void 0:o.name)||s}`:""}:

${a.map((r,c)=>`${c+1}. ${r}`).join(`
`)}

Paste the exact error message and I'll narrow it down further.`,suggestions:u.troubleshoot}}function pe(s){return{text:`Here's how I'd structure an architecture review:

**1. Reliability**
- Multi-AZ? If any tier is single-AZ, that's your first finding.
- Stateful tiers backed by a managed service (RDS, DynamoDB, ElastiCache)?
- Failure modes documented + tested (Chaos drill)?

**2. Security**
- Least-privilege IAM roles per workload?
- Secrets in Secrets Manager (not env vars in code)?
- All data encrypted in transit (TLS) and at rest (SSE)?
- VPC Flow Logs + GuardDuty + CloudTrail enabled?

**3. Performance**
- CDN in front of public traffic (CloudFront)?
- Cache layer (ElastiCache) for hot reads?
- Right instance family? (R for memory, C for compute, T only for low-burst)

**4. Cost**
- NAT Gateways: one per AZ, but minimize by VPC endpoints for S3/DynamoDB.
- Storage tiers: lifecycle to IA / Glacier for cold data.
- Spot/Savings Plans on baseline compute?

**5. Operational excellence**
- Pipeline as code (Terraform/CDK)?
- Dashboards + alarms?
- Runbooks?

Paste your diagram (or describe it) and I'll apply this to your design.`,suggestions:u["arch-review"]}}function he(s){return{text:`A solid AWS study plan looks like:

**Week 1-2 — Foundations**
- Cloud concepts, regions/AZs, IAM, billing.
- 2-3 hands-on labs.

**Week 3-5 — Service depth (by exam weighting)**
- For SAA: ~30% security/IAM, ~26% reliability, ~24% performance, ~20% cost.
- Knock out the heaviest domain first.

**Week 6 — Architecture practice**
- Read 3 real reference architectures.
- Build at least one end-to-end.

**Week 7 — Mock exams**
- One full mock per week minimum. Review wrong answers in depth.

**Final week — Review only**
- Re-read your notes. Don't learn new topics in week 8.

Use the Study Plan Generator on the AI page to get an exact day-by-day calendar tailored to your exam date and hours per day.`,suggestions:u["study-plan"],links:[{label:"Open Study Plan Generator",to:"/ai/study-plan"}]}}function fe(){var o;const s=N.flatMap(r=>r.topics.map(c=>({c:r,t:c}))),e=new Date().toISOString().slice(0,10),t=ye(e)%s.length,a=s[t];return{text:`Today's recommendation: **${a.t.title}** in *${a.c.title}*.

${a.t.summary||((o=a.t.simpleEnglish)==null?void 0:o.slice(0,240))||""}

Open it in the Learning Lab and aim for 20-30 minutes — read the deep dive, then run the quiz at the bottom.`,suggestions:u.recommend,links:[{label:"Open this topic",to:`/learning/${a.c.id}/${a.t.id}`}]}}function ge(s){const e=(s||"").toLowerCase();if(e){for(const t of N)for(const a of t.topics)if(a.title.toLowerCase().includes(e)||(a.summary||"").toLowerCase().includes(e))return{text:`The closest Learning Lab topic I have is **${a.title}** in *${t.title}*.

${a.simpleEnglish||a.summary||""}

Open it for the full deep dive.`,suggestions:u.general,links:[{label:"Open topic",to:`/learning/${t.id}/${a.id}`}]}}return{text:`I can answer pretty much any AWS question. Try being a bit more specific — name a service, paste an error, or ask for a comparison.

Some prompts that work well:
• "Explain Lambda simply"
• "Compare S3 vs EFS"
• "Why is my Lambda getting AccessDenied to DynamoDB?"
• "Terraform for an S3 bucket"
• "Quiz me on VPC"`,suggestions:u.general}}function be(s){const t={s3:{categoryId:"sto",topicId:"c3-t1"},ec2:{categoryId:"cmp",topicId:"c2-t1"},lambda:{categoryId:"cmp",topicId:"c2-t3"},dynamodb:{categoryId:"db",topicId:"c6-t4"},rds:{categoryId:"db",topicId:"c6-t2"},vpc:{categoryId:"net",topicId:"c4-t1"},cloudfront:{categoryId:"net",topicId:"c4-t4"},iam:{categoryId:"sec",topicId:"c5-t1"}}[s];return t?[{label:"Open in Learning Lab",to:`/learning/${t.categoryId}/${t.topicId}`}]:[]}function ye(s){let e=5381;for(let t=0;t<s.length;t++)e=(e*33^s.charCodeAt(t))>>>0;return e}function xe(s,e,{msPerChunk:t=12,chunkSize:a=3,onDone:l}={}){let o=!1,r=0;const c=()=>{if(o)return;const d=s.slice(0,r);if(e(d),r>=s.length){l==null||l();return}r=Math.min(s.length,r+a),setTimeout(c,t)};return c(),()=>{o=!0}}const we=["Explain Lambda to me simply","Compare S3 vs EFS","Quiz me on VPC fundamentals","What should I study today?","Why is my Lambda getting AccessDenied to DynamoDB?","Terraform for an S3 bucket","Summarize the Well-Architected Framework","Review my 3-tier web architecture"],ve=380;function Ne(){const{state:s,appendMessage:e,replaceLastMessage:t,clearChat:a,saveAINote:l}=j(),o=D(),r=B(),[c,d]=p.useState(""),[b,k]=p.useState(!1),y=p.useRef(null),A=p.useRef(null),C=p.useRef(null),h=s.chat,$=h.length>0;p.useEffect(()=>{const i=A.current;i&&(i.scrollTop=i.scrollHeight)},[h,b]),p.useEffect(()=>()=>{var i;return(i=y.current)==null?void 0:i.call(y)},[]),p.useEffect(()=>{try{const i=sessionStorage.getItem("ai-assistant:prefill");i&&(sessionStorage.removeItem("ai-assistant:prefill"),d(i),setTimeout(()=>{var m;return(m=C.current)==null?void 0:m.focus()},100))}catch{}},[]);const x=i=>{const m=(i??c).trim();if(!m||b)return;d(""),e({role:"user",text:m});const{intent:f,payload:R}=X(m),v=se({intent:f,payload:R});k(!0),setTimeout(()=>{e({role:"assistant",text:"",suggestions:v.suggestions,links:v.links}),k(!1),y.current=xe(v.text,W=>{t({text:W})},{msPerChunk:14,chunkSize:4})},ve)},L=i=>{i.key==="Enter"&&!i.shiftKey&&(i.preventDefault(),x())};return n.jsxs("div",{className:"space-y-4",children:[n.jsxs(G,{to:"/ai",className:"inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange",children:[n.jsx(M,{size:14})," AI hub"]}),n.jsx(F,{eyebrow:"AI Study Assistant",title:"Talk to a senior AWS architect",subtitle:"Explain services, generate practice questions, troubleshoot errors, write Terraform, summarize whitepapers. Persistent chat — your full history stays.",icon:S,actions:n.jsx("div",{className:"flex items-center gap-2",children:n.jsx("button",{onClick:()=>{confirm("Clear all chat history?")&&a()},className:"btn btn-ghost !px-3",title:"Clear chat",children:n.jsx(Y,{size:14})})})}),n.jsxs("div",{className:"surface rounded-3xl flex flex-col overflow-hidden gradient-border",style:{height:"min(72vh, 720px)"},children:[n.jsxs("div",{ref:A,className:"flex-1 overflow-y-auto p-4 sm:p-6 space-y-4",children:[$?h.map((i,m)=>n.jsx(P,{m:i,isLast:m===h.length-1,onCopy:()=>Ae(i.text,o),onSave:()=>{l("chat",i.text),o.success("Saved to AI notes")},onSuggestion:f=>x(f),onLink:f=>f.to&&r(f.to)},i.id)):n.jsx(Se,{onPick:i=>x(i)}),b&&n.jsx(P,{m:{role:"assistant",text:"",thinking:!0},onCopy:()=>{},onSave:()=>{},onSuggestion:()=>{}})]}),n.jsxs("div",{className:"border-t border-token p-3 sm:p-4 bg-[var(--card-2)]/40",children:[n.jsxs("div",{className:"flex items-end gap-2",children:[n.jsx("textarea",{ref:C,value:c,onChange:i=>d(i.target.value),onKeyDown:L,rows:1,placeholder:"Ask anything AWS — services, errors, code, exam prep…",className:"flex-1 resize-none bg-[var(--card)] border border-token rounded-xl px-3.5 py-2.5 text-sm leading-relaxed focus-ring focus:border-aws-orange max-h-40",style:{minHeight:44}}),n.jsx("button",{onClick:()=>x(),disabled:!c.trim()||b,className:w("btn btn-primary !px-3 h-[44px]",(!c.trim()||b)&&"opacity-40 cursor-not-allowed"),children:n.jsx(Z,{size:14})})]}),n.jsxs("div",{className:"mt-1.5 flex items-center justify-between text-[10px] text-muted",children:[n.jsx("span",{children:"↵ to send · Shift+↵ for newline"}),n.jsxs("span",{children:[h.length," message",h.length===1?"":"s"," · persistent"]})]})]})]}),s.savedNotes.length>0&&n.jsx(ke,{})]})}function P({m:s,isLast:e,onCopy:t,onSave:a,onSuggestion:l,onLink:o}){const r=s.role==="user";return n.jsxs(O.div,{initial:{opacity:0,y:6},animate:{opacity:1,y:0},transition:{duration:.18},className:w("flex gap-2.5 sm:gap-3",r?"justify-end":""),children:[!r&&n.jsx("div",{className:"w-8 h-8 rounded-xl bg-gradient-aws grid place-items-center text-ink-950 flex-shrink-0 shadow-glow-orange",children:n.jsx(S,{size:16,strokeWidth:2.5})}),n.jsxs("div",{className:w("flex-1 max-w-[80%]",r&&"flex flex-col items-end"),children:[n.jsx("div",{className:w("rounded-2xl px-4 py-3 transition",r?"bg-gradient-aws text-ink-950 shadow-glow-orange":"surface-2 border border-token text-[var(--text)]"),children:s.thinking?n.jsx(Q,{}):r?n.jsx("p",{className:"text-sm font-semibold leading-relaxed whitespace-pre-wrap",children:s.text}):n.jsx(V,{source:s.text||""})}),!r&&!s.thinking&&s.text&&n.jsxs("div",{className:"mt-2 flex flex-wrap items-center gap-1.5",children:[n.jsx(T,{icon:H,label:"Copy",onClick:t}),n.jsx(T,{icon:U,label:"Save",onClick:a}),(s.links||[]).map((c,d)=>n.jsxs("button",{onClick:()=>o==null?void 0:o(c),className:"inline-flex items-center gap-1 chip border border-aws-orange/40 bg-aws-orange/10 text-aws-orange text-[11px] font-bold",children:[c.label," ",n.jsx(_,{size:10})]},d)),e&&(s.suggestions||[]).map((c,d)=>n.jsxs("button",{onClick:()=>l(c),className:"inline-flex items-center gap-1 chip border border-token bg-[var(--card-2)] hover:bg-[var(--card)] text-[11px] font-bold transition",children:[n.jsx(E,{size:10,className:"text-aws-orange"})," ",c]},`s-${d}`))]})]}),r&&n.jsx("div",{className:"w-8 h-8 rounded-xl bg-[var(--card-2)] border border-token grid place-items-center text-muted flex-shrink-0",children:n.jsx(q,{size:16})})]})}function T({icon:s,label:e,onClick:t}){return n.jsxs("button",{onClick:t,className:"inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-muted hover:text-aws-orange hover:bg-[var(--card-2)] transition",children:[n.jsx(s,{size:11})," ",e]})}function Se({onPick:s}){return n.jsx("div",{className:"h-full grid place-items-center p-6",children:n.jsxs("div",{className:"max-w-2xl text-center",children:[n.jsx("div",{className:"inline-grid place-items-center w-16 h-16 rounded-3xl bg-gradient-aws shadow-glow-orange mb-4",children:n.jsx(S,{size:28,className:"text-ink-950",strokeWidth:2.5})}),n.jsx("h2",{className:"text-2xl sm:text-3xl font-extrabold tracking-tight",children:"Ask me anything AWS."}),n.jsx("p",{className:"text-sm text-muted mt-2",children:"I can explain services simply, write Terraform, summarize whitepapers, generate practice questions, and troubleshoot errors."}),n.jsx("div",{className:"mt-6 grid sm:grid-cols-2 gap-2 text-left",children:we.map(e=>n.jsxs("button",{onClick:()=>s(e),className:"group flex items-center gap-2.5 rounded-xl border border-token bg-[var(--card-2)]/40 hover:bg-[var(--card-2)] hover:border-aws-orange/40 transition focus-ring p-3 text-sm font-semibold text-left",children:[n.jsx(E,{size:14,className:"text-aws-orange flex-shrink-0 group-hover:scale-110 transition"}),n.jsx("span",{className:"flex-1",children:e}),n.jsx(_,{size:12,className:"text-muted group-hover:text-aws-orange transition"})]},e))})]})})}function ke(){const{state:s,deleteAINote:e}=j();return n.jsxs("section",{className:"surface rounded-2xl p-5",children:[n.jsxs("h3",{className:"text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3",children:["Saved from AI (",s.savedNotes.length,")"]}),n.jsx("ul",{className:"space-y-2",children:s.savedNotes.slice(0,8).map(t=>n.jsxs("li",{className:"group rounded-xl border border-token bg-[var(--card-2)]/40 p-3",children:[n.jsxs("div",{className:"text-[11px] text-muted mb-1 flex items-center justify-between",children:[n.jsx("span",{className:"font-bold uppercase tracking-widest",children:t.source}),n.jsx("button",{onClick:()=>e(t.id),className:"text-[10px] text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition font-bold",children:"Remove"})]}),n.jsx("div",{className:"text-xs leading-relaxed line-clamp-4",children:t.text})]},t.id))})]})}async function Ae(s,e){try{await navigator.clipboard.writeText(s),e.success("Copied to clipboard")}catch{e.error("Could not copy")}}export{Ne as default};
