import{bC as O,ca as u,c2 as e,aj as T,F as q,aG as F,bs as $,S as _,au as D,q as K,am as V,b9 as Y,bn as M,_ as J,bB as A,c5 as Q,cf as C,cy as E,K as H,o as z}from"./index-DjRQ3k0P.js";import{M as k}from"./Markdown-BY0VWiak.js";import{T as X}from"./TypingDots-Dow2j1VI.js";import{M as Z}from"./message-square-BJRlonmw.js";import{C as ee}from"./compass-BJ519AcR.js";/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const te=O("UserRound",[["circle",{cx:"12",cy:"8",r:"5",key:"1hypcn"}],["path",{d:"M20 21a8 8 0 0 0-16 0",key:"rfgkzh"}]]),b=t=>(t.trim().match(/\S+/g)||[]).length,j=(t,s)=>s.some(o=>new RegExp(`\\b${o}\\b`,"i").test(t)),L=t=>t.map(s=>`- ${s}`).join(`
`);function P(t){const s=t.reduce((r,a)=>r+a.weight,0),o=t.reduce((r,a)=>r+(a.hit?a.weight:0),0);return Math.round(o/s*100)}function oe(t){const s=b(t),o=[{key:"AWS keyword presence",weight:12,hit:j(t,["AWS","Amazon Web Services"])},{key:"Specific service depth",weight:12,hit:j(t,["VPC","Lambda","S3","EC2","CloudFront","RDS","EKS","ECS"])},{key:"Quantified outcomes",weight:16,hit:/\b\d+%|\$\d+|\d+x|saved \$|reduced/i.test(t)},{key:"Hourly rate clarity",weight:8,hit:/\$\d+\/?\s*(hr|hour)/i.test(t)},{key:"Networking background",weight:10,hit:j(t,["network","CCNA","BGP","routing","VPN","Direct Connect"])},{key:"Certifications listed",weight:10,hit:j(t,["Certified","Cloud Practitioner","Solutions Architect","SAA","Associate"])},{key:"Call to action",weight:8,hit:/message me|contact|let'?s talk|book a call/i.test(t)},{key:"Strong opening line",weight:8,hit:s>0&&t.split(/\n|\./)[0].trim().length>40},{key:"Word count 150-350",weight:8,hit:s>=150&&s<=350},{key:"No filler / weak words",weight:8,hit:!/passionate|hard-working|team player|self-starter/i.test(t)}],r=P(o),a=o.filter(n=>n.hit).map(n=>n.key),c=o.filter(n=>!n.hit).map(n=>n.key),l=[];return j(t,["AWS","Amazon Web Services"])||l.push('Mention "AWS" at least 3 times in natural context. Recruiters and clients keyword-search.'),/\b\d+%|\$\d+|\d+x/.test(t)||l.push(`Add a quantified outcome: "Cut a client's S3 bill 38%", "Reduced p95 latency from 800ms to 180ms".`),/\$\d+\/?\s*(hr|hour)/i.test(t)||l.push('State your hourly rate clearly (even if "$15–25/hr" range). Removes friction.'),s<150&&l.push(`Profile is too short (${s} words). Aim for 180-300 — enough to demonstrate depth without rambling.`),s>350&&l.push(`Profile is wordy (${s} words). Trim to 250-300; clients skim.`),/passionate|hard-working|team player/i.test(t)&&l.push(`Remove vague words like "passionate" / "hard-working". Show, don't tell.`),j(t,["network","CCNA","BGP"])||l.push("Lead with your networking background — it's rare among AWS freelancers and a huge edge."),{score:r,grade:N(r),text:`# Upwork profile review

**Score: ${r} / 100** (${N(r)})

## What's working
${a.length?L(a):"_Not much yet — keep reading._"}

## What to fix
${c.length?L(c):"_Looks great!_"}

## Specific edits to make
${l.length?l.map((n,d)=>`${d+1}. ${n}`).join(`
`):"_No major edits — only minor polish._"}

## Suggested headline format
> Senior AWS Cloud Engineer | Networking + DevOps | 5★ rated | $XX/hr

Tailor the rate to your level, replace "Senior" with "Junior/Mid" if more honest.`,fields:{score:r,wins:a,gaps:c}}}function se({jobDescription:t,name:s="David",rate:o="20",timezone:r="GMT"}){const a=B(t),c=/urgent|asap|today|tomorrow|this week/i.test(t),l=/\$\d/.test(t),n=/architect|design|architecture/i.test(t)?"architecture":/migrat/i.test(t)?"migration":/cost|optim/i.test(t)?"cost optimization":/security/i.test(t)?"security review":/set ?up|deploy|provision|terraform/i.test(t)?"setup":"AWS work",d=c?`I can start within 24 hours and have done this exact ${n} workload before.`:`Your ${n} project lines up perfectly with what I've shipped for similar clients.`,i=a.length?`I've worked hands-on with ${a.join(", ")} and can show production code.`:"I've shipped this exact stack to production and can show code on request.",p=`Hi there,

${d}

Quick wins I can deliver:
- ${re(n,a)}
- A clear runbook so your team can maintain it after I hand off.
- ${ae(n)}

${i}

A few clarifying questions:
1. ${ne(n)}
2. ${ie(n)}
3. What does "done" look like for you — what's the one outcome that decides this is a success?

Logistics:
- Timezone: ${r}, but I overlap 4+ hours with most US/EU schedules.
- Rate: $${o}/hr (negotiable on fixed-price scope if you prefer).
- Available to jump on a 15-min call this week.

Looking forward to it,
${s}`;return{text:p,fields:{wordCount:b(p),services:a,role:n,isUrgent:c,hasBudget:l}}}function re(t,s){return t==="migration"?"A migration plan with cutover steps, rollback procedure, and zero-downtime strategy.":t==="architecture"?"A Well-Architected design with diagrams, IaC scaffold, and trade-off rationale.":t==="cost optimization"?"A cost teardown with prioritized actions ranked by $$/effort.":t==="security review"?"A security audit mapped to CIS / Well-Architected security pillar, with remediation tickets.":t==="setup"?`A production-grade ${s[0]||"AWS"} setup with Terraform and CI/CD, not a click-ops one-off.`:"A scoped deliverable I commit to in writing before we start."}function ae(t){return t==="cost optimization"?"A spreadsheet of every quick-win with $/month estimate.":t==="migration"?"Tagging strategy + budgets so cost is visible from day one.":"Sensible defaults that keep cost predictable (no NAT-Gateway surprises)."}function ne(t){return t==="migration"?"Source environment specs (versions, data size, peak TPS)?":t==="architecture"?"Hard constraints — region(s), compliance, latency budget?":t==="security review"?"Compliance framework (SOC2 / PCI / HIPAA / none)?":"Your AWS account access plan — read-only IAM user for me, or a separate sandbox account?"}function ie(t){return t==="cost optimization"?"Current monthly spend and biggest line items?":t==="migration"?"Acceptable downtime window?":"Are you set on a specific stack, or open to recommendations?"}function B(t){return["S3","EC2","Lambda","RDS","Aurora","DynamoDB","VPC","CloudFront","Route 53","ECS","EKS","Fargate","API Gateway","CloudWatch","CloudFormation","Terraform","EventBridge","SQS","SNS","Kinesis","Glue","Redshift","Athena","SageMaker","Bedrock","IAM","KMS","Secrets Manager","GuardDuty","WAF","Shield"].filter(o=>new RegExp(`\\b${o.replace(/\s/g,"\\s")}\\b`,"i").test(t))}function le({description:t,region:s="global",experience:o="mid",urgency:r="normal"}){const a=[/multi[- ]?region|disaster recovery|DR/i,/migration|migrate|cutover/i,/architecture|design|well[- ]?architected/i,/security|compliance|HIPAA|PCI|SOC2/i,/terraform|CDK|IaC/i,/microservice|EKS|kubernetes/i,/data lake|warehouse|ETL|pipeline/i,/machine learning|ML|SageMaker|RAG/i].reduce((U,G)=>U+(G.test(t)?1:0),0),c={junior:18,mid:35,senior:65,principal:110}[o]||35,l={uk:1,us:1.15,eu:1.05,asia:.85,global:1}[s]||1,n=r==="urgent"?1.25:r==="low"?.9:1,d=1+a*.12,i=Math.round(c*l*n*d),p=Math.round(i*.85),g=Math.round(i*1.18),m=b(t),h=Math.max(10,Math.round(m/4+a*18)),R=Math.round(h*p*.95),W=Math.round(h*g*1.05);return{text:`# Pricing recommendation

**Hourly:** \`$${p}\`–\`$${g}/hr\` (target $${i}/hr)
**Fixed price:** \`$${R}\`–\`$${W}\` (≈ ${h} hours estimate)

## How I got there
- Base hourly for ${o} engineer: $${c}/hr
- Region multiplier (${s.toUpperCase()}): ×${l}
- Urgency (${r}): ×${n}
- Complexity signals detected: ${a} → ×${d.toFixed(2)}

## Negotiation guardrails
- **Don't go below $${Math.round(i*.75)}/hr** — you'll attract worse clients, not more clients.
- **Anchor high.** Quote the high end first; let the client negotiate down to your real target.
- **Offer two tiers**: a small "spike" engagement to prove value, then a larger follow-on contract.
- **Always include a 10-15% buffer** in fixed-price quotes for scope drift.

## What to ask before quoting
- What's the budget range they have in mind?
- Is there a hard deadline? (Affects urgency multiplier)
- Who owns the AWS account credentials?
- Acceptable downtime / change windows?`,fields:{hourly:i,hourlyLow:p,hourlyHigh:g,fixedLow:R,fixedHigh:W,estHours:h,complexityHits:a}}}function ce({role:t,level:s}){const o={sa:["Walk me through how you'd design a 3-tier web app on AWS that survives an AZ failure.","A SaaS customer says page loads are slow from Europe. Their stack is us-east-1 only. What's your investigation plan?","Compare SQS Standard vs FIFO and tell me when you'd pick each."],devops:["Design a CI/CD pipeline that auto-deploys to staging, gates on tests, and requires manual approval for prod.","How do you handle secrets in a deployment pipeline?","Walk me through a blue/green deploy for a Lambda function."],data:["You ingest 5 GB/sec of clickstream data. Design the ingest + storage + query stack.","When would you pick Redshift vs Athena?","How do you partition S3 data for cheap Athena queries?"],sec:["How do you detect a compromised IAM access key in production?","Walk me through the layers of defense for a public-facing API.","What's the difference between Permission Boundaries, SCPs, and IAM policies?"],net:["Design a hub-and-spoke network with 6 VPCs and an on-prem connection.","Compare Direct Connect vs Site-to-Site VPN — when do you pick each?","How does Route 53 latency-based routing actually work?"],support:["A customer's S3 bucket suddenly stopped accepting uploads. Walk me through your triage.","How do you read a CloudTrail event to understand what an IAM action failed on?","A Lambda is timing out at 30s. What are the first 3 things you check?"],ml:["How would you stand up a RAG chatbot using Bedrock + your company's docs?","Walk me through a SageMaker training job lifecycle.","How do you detect data drift in production?"]};return{questions:o[t]||o.sa}}function de({projects:t}){const s=t.filter(i=>i.complete).length,o=new Set(t.flatMap(i=>i.services||[])).size,r=t.some(i=>(i.services||[]).some(p=>/vpc|tgw|dx|vpn/i.test(p))),a=t.some(i=>(i.services||[]).some(p=>/lambda|api gateway|dynamodb/i.test(p))),c=t.some(i=>(i.services||[]).some(p=>/glue|athena|redshift|kinesis/i.test(p))),l=[{key:"≥ 4 complete projects",weight:25,hit:s>=4},{key:"Breadth (≥ 6 distinct services)",weight:20,hit:o>=6},{key:"Networking project",weight:15,hit:r},{key:"Serverless project",weight:15,hit:a},{key:"Data project",weight:15,hit:c},{key:"Project descriptions are >100 words",weight:10,hit:t.every(i=>b(i.summary||"")>60)}],n=P(l);return{text:`# Portfolio review

**Score: ${n} / 100** (${N(n)})

You have ${s} complete project${s===1?"":"s"} covering ${o} unique AWS services.

## Strengths
${l.filter(i=>i.hit).map(i=>`- ${i.key}`).join(`
`)||"_None yet._"}

## Gaps to close
${l.filter(i=>!i.hit).map(i=>`- ${i.key}`).join(`
`)||"_Looks complete!_"}

## Next project I'd build
${r?a?c?"- A multi-region disaster recovery project — the highest-trust signal to enterprise clients":"- A small data lake (S3 + Glue + Athena) — high enterprise demand":"- A serverless CRUD API (Lambda + API Gateway + DynamoDB) — shows modern AWS skills":"- A hub-and-spoke VPC + Transit Gateway design (plays to your CCNA background)"}`,score:n,fields:{completeCount:s,totalServices:o,hasNetworking:r,hasServerless:a,hasDataLake:c}}}function ue({headline:t,about:s}){const o=[{key:"Headline mentions AWS",weight:20,hit:/aws/i.test(t||"")},{key:"Headline has a specific role",weight:15,hit:/engineer|architect|developer|specialist|consultant/i.test(t||"")},{key:"Headline includes value prop",weight:15,hit:/(\d+|reduce|cut|grow|build|design|migrate|secure|automate)/i.test(t||"")},{key:"About is 100-250 words",weight:15,hit:b(s||"")>=100&&b(s||"")<=250},{key:"About lists specific services",weight:15,hit:B(s||"").length>=3},{key:"About has a CTA at the end",weight:10,hit:/message me|dm me|reach out|let'?s connect|contact/i.test(s||"")},{key:"No filler words (passionate / hard-working)",weight:10,hit:!/passionate|hard-working|team player|self-starter/i.test((t||"")+(s||""))}],r=P(o);return{text:`# LinkedIn optimization plan

**Score: ${r} / 100** (${N(r)})

## Headline rewrite
Try this template:
> **AWS Cloud Engineer** | Networking + Migrations | I help SaaS companies cut AWS bills 20-40%

(Replace the value-prop with your actual one.)

## About section structure
1. **Opening hook** — one-line "what I do + for who".
2. **Proof** — 2-3 quantified wins with specific services.
3. **Stack** — services you actually use (S3, Lambda, VPC, etc.).
4. **CTA** — "DM me if you're running into X."

## Specific edits
${o.filter(c=>!c.hit).map(c=>`- ${c.key}`).join(`
`)||"_Looks solid!_"}

## What I'd add this week
- Post one technical "I broke this and here's what I learned" story.
- Comment thoughtfully on 5 AWS-leader posts.
- Endorse 3 specific connections for AWS skills.`,score:r,fields:{headlineLen:(t||"").length,aboutWords:b(s||"")}}}function pe({niche:t="AWS networking + DevOps"}){return{text:`# 30-day personal branding plan

**Niche:** ${t}

## Week 1 — Foundation
- **Tighten your bio.** Run it through the LinkedIn optimizer.
- **Pick 3 pillar topics.** For ${t}, suggested: networking deep-dives, freelance lessons, AWS cost stories.
- **Set a posting cadence.** 3× LinkedIn + 1× Hashnode/Medium per week is enough.

## Week 2 — Authority
- **Publish one technical teardown** on Hashnode (~1500 words). Pick a recent bug or design you wrestled with.
- **Cross-post the lede** on LinkedIn with a hook + link.
- **Engage on 10 posts/day** from people in ${t}.

## Week 3 — Reach
- **Run a 5-day public learning thread** on LinkedIn (one short post per day).
- **Comment on 3 high-reach posts** from AWS influencers (Stephane Maarek, Adrian Cantrill, etc.).
- **Start a personal newsletter** (Substack/Beehiiv) — even 50 subscribers is leverage.

## Week 4 — Conversion
- **Pin your best post** to LinkedIn featured.
- **Add a "work with me" link** to bio + every article.
- **Reach out to 5 ideal clients** with a value-first DM.

## North-star metric
Pick **one** to optimize:
- Profile views/week (top of funnel)
- DMs from prospects (mid funnel)
- Booked discovery calls/month (bottom funnel)

Track weekly. Adjust monthly. The compounding kicks in around month 3.`}}function he({scenario:t="standard"}){const s={standard:{title:'Client says "$25/hr is too high"',client:'"Honestly $25/hr is more than I budgeted. I was thinking closer to $15. Can you do that?"',goodResponse:`"$15 is below my range — but I appreciate you being upfront. At $25/hr, here's the value you get: [list 3 specific outcomes]. If budget is the constraint, I could scope down to phase 1 only at a fixed $X — same hourly, smaller deliverable. Which path makes more sense?"`,mistakes:["❌ Immediately dropping to $20 (signals your rate was arbitrary)",`❌ Defending the rate emotionally ("I'm worth it!")`,"❌ Agreeing to $15 (you'll resent the project)"]},payterms:{title:"Client wants to pay after delivery (net 30)",client:'"We pay all our vendors net 30 after delivery. Is that OK?"',goodResponse:`"For first-time work I'd like to structure it as 50% upfront, 50% on delivery — it protects us both. After we've worked together once, happy to move to net-15 or net-30 for subsequent projects."`,mistakes:["❌ Just agreeing — you're lending them money","❌ Demanding 100% upfront on first job (most won't accept)","❌ No written agreement on terms"]},scope:{title:"Client is creeping the scope",client:`"Oh and could you also set up the monitoring stack while you're at it? Should be quick."`,goodResponse:`"Happy to — monitoring is a great add. Quick scope: [list what it'd include]. It's about 6-8 hours of work, so an additional $X to the contract. Want me to write up a change order?"`,mistakes:["❌ Saying yes without billing for it","❌ Saying no without offering an alternative",'❌ Doing it "this time" — sets a precedent']}},o=s[t]||s.standard;return{text:`# Negotiation drill — ${o.title}

**Client says:**
> ${o.client}

## A strong response
> ${o.goodResponse}

## Mistakes to avoid
${o.mistakes.map(a=>`- ${a}`).join(`
`)}

## The principles
- **Anchor to value, not effort.** Talk about outcomes.
- **Trade, don't concede.** Every drop in price gets a drop in scope.
- **Silence is a tool.** State your number, then stop talking.
- **Walk-away ready.** If a client only buys on price, they're not your client.`}}function ge({background:t="networking",level:s="beginner",goal:o="freelance"}){const r={"networking|freelance":`# Recommended path — Networking → AWS Freelance

You have a moat most cloud engineers don't — networking depth. Lean in.

## Stage 1 (months 0-3) — Cloud Practitioner + SAA
- Earn **AWS Cloud Practitioner** within 4 weeks.
- Start **Solutions Architect Associate** in week 4 — networking domain will feel natural.
- Build 2 portfolio projects: S3+CloudFront site, EC2 web app behind ALB.

## Stage 2 (months 3-6) — Networking depth + freelance start
- Build the **VPC design project** — your signature.
- Earn **Solutions Architect Associate** by month 6.
- Set up Upwork + LinkedIn properly.
- Take 3 small jobs (even at $15/hr) for reviews.

## Stage 3 (months 6-12) — Specialty + scale
- Start the **Advanced Networking Specialty** prep — your differentiator.
- Raise rate to $35-45/hr.
- Land 2-3 longer-term retainer clients.
- Publish 1 article/week on cloud networking.

## Stage 4 (year 2) — Niche authority
- Earn **Advanced Networking Specialty**.
- Niche down: "AWS networking for fintech" / "VPC design for SaaS" / etc.
- Rate $80-120/hr is achievable in a clear niche.
- Consider: enterprise contracts via consultancies for steadier income.`,"networking|uk-job":`# Recommended path — Networking → UK Cloud Job

Plays to your existing CCNA background.

## Stage 1 (0-2 mo)
- Cloud Practitioner cert.
- 2 portfolio projects (S3+CF, EC2+VPC).
- LinkedIn updated; right-to-work mentioned in bio.

## Stage 2 (2-5 mo)
- SAA cert.
- VPC + Transit Gateway portfolio project.
- Start applying to UK Cloud Engineer / Cloud Network Engineer roles (£45-65k).

## Stage 3 (5-12 mo)
- Land the role.
- Inside, push for projects with networking depth.
- Start Advanced Networking Specialty.

## Stage 4 (year 2+)
- Specialty cert → senior or principal role (£75-110k typical for AWS Network Engineers in UK).`,default:`# Recommended path

Based on your inputs, the high-ROI first move is:

1. **Earn AWS Cloud Practitioner** (4-6 weeks). Low-stakes confidence builder.
2. **Earn Solutions Architect Associate** (8-12 weeks). The cert with highest pay-bump per hour studied.
3. **Build 3-4 portfolio projects**. Document with diagrams and write-ups.
4. **Decide between salaried (UK job) or self-employed (freelance)**. Different next steps.

Use the Smart Study Plan Generator to pace this.`},a=`${t}|${o}`;return{text:r[a]||r.default}}const me={followUp:{label:"Follow-up after proposal",body:`Subject: Quick follow-up on the [project] proposal

Hi {name},

Just bumping this up in case it got buried. Happy to answer any questions or jump on a 10-minute call this week if that's easier than email.

If timing or scope isn't right, no worries — let me know and I'll close the loop.

Best,
{your name}`},scopeChange:{label:"Scope-change request",body:`Subject: Change order for {project}

Hi {name},

Per our conversation, the additional work (X, Y, Z) is outside our original scope. Here's the change order:

- Additional scope: [details]
- Estimated effort: [N hours]
- Cost: $[N] additional, billed [at next milestone / weekly]
- Impact on timeline: [+ N days]

Reply with "approved" and I'll start. Happy to discuss alternatives if budget is tight.

Best,
{your name}`},invoiceCover:{label:"Invoice cover email",body:`Subject: Invoice #[N] for {project} — due [date]

Hi {name},

Attaching invoice #[N] for {project}, dated [date].

Summary:
- [Deliverable 1]
- [Deliverable 2]
- Total: $[amount]
- Payment via: [Wise / Payoneer / Stripe link]
- Due: [date]

Thanks for the work — really enjoyed building this with your team.

Best,
{your name}`},kickoff:{label:"Project kickoff",body:`Subject: Welcome aboard — {project} kickoff

Hi {name},

Excited to get started. Here's how I work so we're on the same page:

- **Updates**: short Slack/email every Friday with progress, blockers, next steps.
- **Calls**: 30 min check-in weekly. I'll propose a time.
- **Repo**: I'll commit to [github URL] and tag you on every PR.
- **Hours**: I'll log via Toggl and send a weekly timesheet.

To kick off:
1. Read-only IAM access to the AWS account (I'll send the policy JSON).
2. Slack invite or preferred chat tool.
3. Any docs or context I should read first.

Let's ship something great.

Best,
{your name}`}};function N(t){return t>=90?"A — strong, polish a few corners":t>=75?"B — solid, a few clear wins to add":t>=60?"C — workable, needs sharpening":t>=40?"D — significant gaps":"F — start over with the template"}const xe=[{id:"profile",label:"Upwork profile review",icon:te},{id:"proposal",label:"Proposal generator",icon:Z},{id:"pricing",label:"Pricing advisor",icon:_},{id:"interview",label:"Interview prep",icon:D},{id:"portfolio",label:"Portfolio reviewer",icon:K},{id:"linkedin",label:"LinkedIn optimizer",icon:V},{id:"branding",label:"Personal branding",icon:Y},{id:"negotiate",label:"Negotiation drill",icon:M},{id:"path",label:"Career path advisor",icon:ee},{id:"templates",label:"Client templates",icon:J}];function Le(){const[t,s]=u.useState("profile");return e.jsxs("div",{className:"space-y-5",children:[e.jsxs(T,{to:"/ai",className:"inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange",children:[e.jsx(q,{size:14})," AI hub"]}),e.jsx(F,{eyebrow:"AI Career Coach",title:"Land paid AWS work, faster.",subtitle:"Ten focused tools — profile review, proposal writer, pricing, mock interviews, negotiation drills, and more. Every output is yours to copy or save.",icon:$}),e.jsx("div",{className:"flex gap-1.5 overflow-x-auto no-scrollbar rounded-2xl surface-2 p-1.5 border border-token",children:xe.map(o=>{const r=o.icon;return e.jsxs("button",{onClick:()=>s(o.id),className:A("inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition focus-ring flex-shrink-0",t===o.id?"bg-gradient-aws text-ink-950 shadow-glow-orange":"text-muted hover:text-current"),children:[e.jsx(r,{size:13})," ",o.label]},o.id)})}),e.jsxs(Q.div,{initial:{opacity:0,y:6},animate:{opacity:1,y:0},transition:{duration:.18},children:[t==="profile"&&e.jsx(fe,{}),t==="proposal"&&e.jsx(we,{}),t==="pricing"&&e.jsx(be,{}),t==="interview"&&e.jsx(ke,{}),t==="portfolio"&&e.jsx(ye,{}),t==="linkedin"&&e.jsx(ve,{}),t==="branding"&&e.jsx(je,{}),t==="negotiate"&&e.jsx(Se,{}),t==="path"&&e.jsx(Ae,{}),t==="templates"&&e.jsx(Ce,{})]},t)]})}function y({disabled:t,label:s="Generate",onClick:o,busy:r}){return e.jsx("button",{onClick:o,disabled:t||r,className:A("btn btn-primary",(t||r)&&"opacity-40 cursor-not-allowed"),children:r?e.jsx(X,{}):e.jsxs(e.Fragment,{children:[e.jsx($,{size:14})," ",s]})})}function f({children:t}){return e.jsxs("div",{className:"surface rounded-2xl p-5 gradient-border relative overflow-hidden",children:[e.jsx("div",{className:"absolute -top-16 -right-16 w-40 h-40 bg-electric/10 rounded-full blur-3xl pointer-events-none"}),e.jsx("div",{className:"relative",children:t})]})}function w({text:t,sourceLabel:s}){const o=E(),{saveAINote:r}=C();return e.jsxs("div",{className:"mt-4 flex flex-wrap items-center gap-2 print:hidden",children:[e.jsxs("button",{onClick:async()=>{try{await navigator.clipboard.writeText(t),o.success("Copied")}catch{o.error("Copy failed")}},className:"btn btn-ghost !text-xs !py-2",children:[e.jsx(H,{size:12})," Copy"]}),e.jsxs("button",{onClick:()=>{r(s,t),o.success("Saved to AI notes")},className:"btn btn-ghost !text-xs !py-2",children:[e.jsx(z,{size:12})," Save"]})]})}function I({score:t}){const s=t>=80?"text-success border-success/40 bg-success/10":t>=60?"text-warning border-warning/40 bg-warning/10":"text-danger border-danger/40 bg-danger/10";return e.jsxs("span",{className:A("chip border font-extrabold text-sm",s),children:[e.jsx(M,{size:14})," ",t,"/100"]})}function fe(){const{state:t,setCoach:s}=C(),[o,r]=u.useState(t.coach.upworkProfile||""),[a,c]=u.useState(null),l=()=>{const n=oe(o);c(n),s({upworkProfile:o,upworkScore:n.score})};return e.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[e.jsxs("div",{className:"surface rounded-2xl p-5",children:[e.jsx("h3",{className:"text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3",children:"Paste your Upwork profile"}),e.jsx("textarea",{rows:14,value:o,onChange:n=>r(n.target.value),placeholder:"Paste your full profile — the about/overview section is most useful.",className:"w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-sm leading-relaxed focus-ring focus:border-aws-orange resize-y"}),e.jsxs("div",{className:"mt-3 flex items-center justify-between gap-2",children:[e.jsxs("span",{className:"text-[11px] text-muted",children:[(o.trim().match(/\S+/g)||[]).length," words"]}),e.jsx(y,{disabled:!o.trim(),onClick:l,label:"Score my profile"})]})]}),a?e.jsxs(f,{children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsx("h3",{className:"text-[11px] font-extrabold uppercase tracking-widest text-aws-orange",children:"Result"}),e.jsx(I,{score:a.score})]}),e.jsx(k,{source:a.text}),e.jsx(w,{text:a.text,sourceLabel:"profile-review"})]}):e.jsx(v,{hint:"Paste your profile and click “Score my profile”."})]})}function we(){const{addProposal:t,state:s}=C(),[o,r]=u.useState(""),[a,c]=u.useState("22"),[l,n]=u.useState("GMT"),[d,i]=u.useState(""),[p,g]=u.useState(null),m=()=>{const h=se({jobDescription:o,rate:a,timezone:l,name:d||"there"});g(h),t({jobDesc:o,proposal:h.text})};return e.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[e.jsxs("div",{className:"surface rounded-2xl p-5 space-y-3",children:[e.jsx("h3",{className:"text-[11px] font-extrabold uppercase tracking-widest text-aws-orange",children:"Job description"}),e.jsx("textarea",{rows:10,value:o,onChange:h=>r(h.target.value),placeholder:"Paste the Upwork job posting…",className:"w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-sm leading-relaxed focus-ring focus:border-aws-orange resize-y"}),e.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[e.jsx(S,{label:"Your name",value:d,onChange:i,placeholder:"David"}),e.jsx(S,{label:"Your rate ($/hr)",value:a,onChange:c,placeholder:"22"}),e.jsx(S,{label:"Timezone",value:l,onChange:n,placeholder:"GMT"})]}),e.jsx(y,{disabled:!o.trim(),onClick:m,label:"Write proposal"}),s.coach.proposals.length>0&&e.jsxs("div",{className:"pt-3 border-t border-token",children:[e.jsx("div",{className:"text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1.5",children:"Recent"}),e.jsx("ul",{className:"space-y-1 max-h-32 overflow-y-auto",children:s.coach.proposals.slice(0,5).map(h=>e.jsxs("li",{className:"text-[11px] text-muted truncate",children:["→ ",h.jobDesc.slice(0,60),"…"]},h.id))})]})]}),p?e.jsxs(f,{children:[e.jsxs("h3",{className:"text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3",children:["Your proposal (",p.fields.wordCount," words)"]}),e.jsx("div",{className:"rounded-xl border border-token bg-[var(--card-2)]/40 p-4 whitespace-pre-wrap text-sm leading-relaxed",children:p.text}),e.jsx(w,{text:p.text,sourceLabel:"proposal"})]}):e.jsx(v,{hint:"Paste a job description and click “Write proposal”."})]})}function be(){const{addPricing:t}=C(),[s,o]=u.useState(""),[r,a]=u.useState("mid"),[c,l]=u.useState("uk"),[n,d]=u.useState("normal"),[i,p]=u.useState(null),g=()=>{const m=le({description:s,experience:r,region:c,urgency:n});p(m),t({description:s,recommendation:m.fields})};return e.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[e.jsxs("div",{className:"surface rounded-2xl p-5 space-y-3",children:[e.jsx("h3",{className:"text-[11px] font-extrabold uppercase tracking-widest text-aws-orange",children:"Describe the project"}),e.jsx("textarea",{rows:8,value:s,onChange:m=>o(m.target.value),placeholder:"e.g. Migrate a Postgres DB from on-prem to RDS Multi-AZ. ~200GB. Cutover window 2 hours.",className:"w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-sm leading-relaxed focus-ring focus:border-aws-orange resize-y"}),e.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[e.jsx(x,{label:"Experience",value:r,onChange:a,options:[["junior","Junior"],["mid","Mid"],["senior","Senior"],["principal","Principal"]]}),e.jsx(x,{label:"Region",value:c,onChange:l,options:[["uk","UK"],["us","US"],["eu","EU"],["asia","Asia"],["global","Global"]]}),e.jsx(x,{label:"Urgency",value:n,onChange:d,options:[["low","Low"],["normal","Normal"],["urgent","Urgent"]]})]}),e.jsx(y,{disabled:!s.trim(),onClick:g,label:"Recommend rate"})]}),i?e.jsxs(f,{children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsx("h3",{className:"text-[11px] font-extrabold uppercase tracking-widest text-aws-orange",children:"Recommendation"}),e.jsxs("span",{className:"chip bg-aws-orange/10 text-aws-orange border border-aws-orange/30 font-extrabold",children:["$",i.fields.hourlyLow,"–$",i.fields.hourlyHigh,"/hr"]})]}),e.jsx(k,{source:i.text}),e.jsx(w,{text:i.text,sourceLabel:"pricing"})]}):e.jsx(v,{hint:"Describe the project and click “Recommend rate”."})]})}function ke(){const[t,s]=u.useState("sa"),[o,r]=u.useState("mid"),[a,c]=u.useState(null),l=u.useMemo(()=>ce({role:t,level:o}),[t,o]);return e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"surface rounded-2xl p-4 flex flex-wrap items-center gap-2",children:[e.jsx(x,{label:"Role",value:t,onChange:s,options:[["sa","Solutions Architect"],["devops","DevOps Engineer"],["data","Data Engineer"],["sec","Security Engineer"],["net","Network Engineer"],["support","Support Engineer"],["ml","ML Engineer"]]}),e.jsx(x,{label:"Level",value:o,onChange:r,options:[["junior","Junior"],["mid","Mid"],["senior","Senior"],["principal","Principal"]]}),e.jsxs(T,{to:"/ai/interview",className:"ml-auto btn btn-primary !text-xs",children:[e.jsx(D,{size:12})," Run full mock interview"]})]}),e.jsx("div",{className:"grid gap-3 lg:grid-cols-2",children:l.questions.map((n,d)=>e.jsxs("button",{onClick:()=>c(a===d?null:d),className:A("group rounded-2xl border p-4 text-left transition focus-ring",a===d?"border-aws-orange bg-aws-orange/5":"border-token bg-[var(--card-2)]/40 hover:bg-[var(--card-2)]"),children:[e.jsxs("div",{className:"text-[10px] font-extrabold uppercase tracking-widest text-aws-orange",children:["Question ",d+1]}),e.jsx("p",{className:"text-sm font-bold mt-1 leading-snug",children:n}),a===d&&e.jsxs("div",{className:"mt-3 pt-3 border-t border-token text-xs text-muted leading-relaxed",children:[e.jsx("strong",{className:"text-success",children:"Tip:"})," use the STAR framework — Situation, Task, Action, Result. Quantify the result wherever possible."]})]},d))})]})}function ye(){const[t,s]=u.useState([{name:"",summary:"",services:"",complete:!1}]),[o,r]=u.useState(null),a=(n,d)=>s(i=>i.map((p,g)=>g===n?{...p,...d}:p)),c=()=>s(n=>[...n,{name:"",summary:"",services:"",complete:!1}]),l=()=>{const n=t.filter(d=>d.name.trim()).map(d=>({...d,services:d.services.split(",").map(i=>i.trim()).filter(Boolean)}));r(de({projects:n}))};return e.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[e.jsxs("div",{className:"surface rounded-2xl p-5 space-y-3",children:[e.jsx("h3",{className:"text-[11px] font-extrabold uppercase tracking-widest text-aws-orange",children:"Describe your projects"}),t.map((n,d)=>e.jsxs("div",{className:"rounded-xl border border-token bg-[var(--card-2)]/40 p-3 space-y-2",children:[e.jsx("input",{value:n.name,onChange:i=>a(d,{name:i.target.value}),placeholder:"Project name",className:"w-full bg-[var(--card)] border border-token rounded-lg px-2.5 py-2 text-sm font-bold focus-ring focus:border-aws-orange"}),e.jsx("textarea",{value:n.summary,onChange:i=>a(d,{summary:i.target.value}),placeholder:"2-3 sentence summary",rows:2,className:"w-full bg-[var(--card)] border border-token rounded-lg px-2.5 py-2 text-xs focus-ring focus:border-aws-orange"}),e.jsx("input",{value:n.services,onChange:i=>a(d,{services:i.target.value}),placeholder:"Services (comma-separated): S3, CloudFront, Route 53",className:"w-full bg-[var(--card)] border border-token rounded-lg px-2.5 py-2 text-xs focus-ring focus:border-aws-orange"}),e.jsxs("label",{className:"text-[11px] font-bold inline-flex items-center gap-2",children:[e.jsx("input",{type:"checkbox",checked:n.complete,onChange:i=>a(d,{complete:i.target.checked}),className:"accent-aws-orange w-4 h-4"}),"Complete & documented"]})]},d)),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:c,className:"btn btn-ghost !text-xs flex-1",children:"+ Add project"}),e.jsx(y,{disabled:!t.some(n=>n.name.trim()),onClick:l,label:"Score portfolio"})]})]}),o?e.jsxs(f,{children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsx("h3",{className:"text-[11px] font-extrabold uppercase tracking-widest text-aws-orange",children:"Result"}),e.jsx(I,{score:o.score})]}),e.jsx(k,{source:o.text}),e.jsx(w,{text:o.text,sourceLabel:"portfolio-review"})]}):e.jsx(v,{hint:"Add your projects and click “Score portfolio”."})]})}function ve(){const[t,s]=u.useState(""),[o,r]=u.useState(""),[a,c]=u.useState(null);return e.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[e.jsxs("div",{className:"surface rounded-2xl p-5 space-y-3",children:[e.jsx(S,{label:"Headline (under 220 chars)",value:t,onChange:s,placeholder:"AWS Cloud Engineer | Networking + DevOps"}),e.jsxs("div",{children:[e.jsx("label",{className:"text-[11px] font-extrabold uppercase tracking-widest text-muted",children:"About section"}),e.jsx("textarea",{value:o,onChange:l=>r(l.target.value),rows:10,placeholder:"Paste your About section…",className:"mt-1.5 w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-sm leading-relaxed focus-ring focus:border-aws-orange resize-y"})]}),e.jsx(y,{disabled:!t.trim()||!o.trim(),onClick:()=>c(ue({headline:t,about:o})),label:"Optimize LinkedIn"})]}),a?e.jsxs(f,{children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsx("h3",{className:"text-[11px] font-extrabold uppercase tracking-widest text-aws-orange",children:"Plan"}),e.jsx(I,{score:a.score})]}),e.jsx(k,{source:a.text}),e.jsx(w,{text:a.text,sourceLabel:"linkedin"})]}):e.jsx(v,{hint:"Paste your headline + about and click “Optimize LinkedIn”."})]})}function je(){const[t,s]=u.useState("AWS networking + DevOps for fintech"),[o,r]=u.useState(null);return e.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[e.jsxs("div",{className:"surface rounded-2xl p-5 space-y-3",children:[e.jsx(S,{label:"Your niche",value:t,onChange:s}),e.jsx("p",{className:"text-xs text-muted leading-relaxed",children:'A clear niche is the single biggest lever for rate. "AWS engineer" is commodity; "AWS networking for fintech" commands 3× the rate. Be specific.'}),e.jsx(y,{disabled:!t.trim(),onClick:()=>r(pe({niche:t})),label:"Generate 30-day plan"})]}),o?e.jsxs(f,{children:[e.jsx(k,{source:o.text}),e.jsx(w,{text:o.text,sourceLabel:"branding-plan"})]}):e.jsx(v,{hint:"Enter your niche and click generate."})]})}function Se(){const[t,s]=u.useState("standard"),o=u.useMemo(()=>he({scenario:t}),[t]);return e.jsxs("div",{className:"grid gap-4 lg:grid-cols-[260px_1fr]",children:[e.jsxs("div",{className:"surface rounded-2xl p-4 space-y-2 h-fit",children:[e.jsx("h3",{className:"text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-2",children:"Scenario"}),[["standard","Rate pushback"],["payterms","Payment terms"],["scope","Scope creep"]].map(([r,a])=>e.jsx("button",{onClick:()=>s(r),className:A("w-full text-left rounded-xl px-3 py-2.5 text-sm font-bold border transition",t===r?"bg-aws-orange/10 border-aws-orange/40 text-aws-orange":"bg-[var(--card-2)]/40 border-token hover:bg-[var(--card-2)]"),children:a},r))]}),e.jsxs(f,{children:[e.jsx(k,{source:o.text}),e.jsx(w,{text:o.text,sourceLabel:"negotiation-drill"})]})]})}function Ae(){const[t,s]=u.useState("networking"),[o,r]=u.useState("beginner"),[a,c]=u.useState("freelance"),[l,n]=u.useState(null);return e.jsxs("div",{className:"grid gap-4 lg:grid-cols-[320px_1fr]",children:[e.jsxs("div",{className:"surface rounded-2xl p-5 space-y-3 h-fit",children:[e.jsx(x,{label:"Background",value:t,onChange:s,options:[["networking","Networking / CCNA"],["dev","Software development"],["sysadmin","SysAdmin / Ops"],["data","Data / analytics"]]}),e.jsx(x,{label:"Current level",value:o,onChange:r,options:[["beginner","Beginner"],["intermediate","Intermediate"],["advanced","Advanced"]]}),e.jsx(x,{label:"Goal",value:a,onChange:c,options:[["freelance","Freelance income"],["uk-job","UK cloud job"],["certs","AWS certifications"]]}),e.jsx(y,{onClick:()=>n(ge({background:t,level:o,goal:a})),label:"Plot my path"})]}),l?e.jsxs(f,{children:[e.jsx(k,{source:l.text}),e.jsx(w,{text:l.text,sourceLabel:"career-path"})]}):e.jsx(v,{hint:"Pick your inputs and click “Plot my path”."})]})}function Ce(){const t=E(),{saveAINote:s}=C();return e.jsx("div",{className:"grid gap-3 sm:grid-cols-2",children:Object.entries(me).map(([o,r])=>e.jsxs("div",{className:"surface rounded-2xl p-4",children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("h4",{className:"text-sm font-extrabold tracking-tight",children:r.label}),e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx("button",{onClick:async()=>{await navigator.clipboard.writeText(r.body),t.success("Copied")},className:"btn btn-ghost !text-[11px] !py-1.5 !px-2",children:e.jsx(H,{size:11})}),e.jsx("button",{onClick:()=>{s(`template-${o}`,r.body),t.success("Saved")},className:"btn btn-ghost !text-[11px] !py-1.5 !px-2",children:e.jsx(z,{size:11})})]})]}),e.jsx("pre",{className:"text-xs whitespace-pre-wrap text-muted leading-relaxed font-sans",children:r.body})]},o))})}function S({label:t,value:s,onChange:o,placeholder:r}){return e.jsxs("label",{className:"block flex-1 min-w-[120px]",children:[e.jsx("span",{className:"text-[10px] font-extrabold uppercase tracking-widest text-muted",children:t}),e.jsx("input",{value:s,onChange:a=>o(a.target.value),placeholder:r,className:"mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-2.5 py-2 text-xs font-semibold focus-ring focus:border-aws-orange"})]})}function x({label:t,value:s,onChange:o,options:r}){return e.jsxs("label",{className:"block flex-1 min-w-[110px]",children:[e.jsx("span",{className:"text-[10px] font-extrabold uppercase tracking-widest text-muted",children:t}),e.jsx("select",{value:s,onChange:a=>o(a.target.value),className:"mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-2 py-2 text-xs font-bold focus-ring focus:border-aws-orange",children:r.map(([a,c])=>e.jsx("option",{value:a,children:c},a))})]})}function v({hint:t}){return e.jsxs("div",{className:"surface rounded-2xl p-8 text-center text-sm text-muted border-2 border-dashed border-token",children:[e.jsx($,{size:20,className:"mx-auto text-aws-orange/60 mb-2"}),t]})}export{Le as default};
