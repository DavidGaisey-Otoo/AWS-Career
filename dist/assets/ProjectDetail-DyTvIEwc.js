import{bC as oe,ca as N,c2 as e,c5 as z,E as le,e as ce,bB as D,ch as de,ct as re,cy as W,D as L,V as U,aX as F,Z as me,G as xe,bV as E,cl as ue,ao as he,b9 as M,bs as pe,K as I,cs as ge,bU as be,cr as fe,aj as Y,i as q,a_ as Q,aC as K,u as Z,a$ as je,bH as ve,s as J,an as ee,bL as se,bn as we,bg as ye,ad as Ne,I as ke,k as te,b8 as $e,aZ as B,f as Se,bc as _e,aB as Ce,at as Ae,bb as De,_ as ze,ag as Pe,M as Ee}from"./index-DjRQ3k0P.js";import{D as Te,A as Re}from"./DifficultyMeter-_jrgof46.js";import{suggestRepoName as Le,dataUrlToBase64 as Ue,pushPortfolioRepo as Me}from"./githubPush-CqmGC0mR.js";import{G as T}from"./github-CzwVOxNL.js";import{C as O}from"./circle-alert-CpYK7UVp.js";import{S as Be}from"./ServiceBadge-CE9r5MnM.js";import{B as Ge}from"./building-2-BLcGn1ZC.js";import{L as He}from"./link-2-BpHAylbH.js";import{V as Fe}from"./video-B2P5OmOt.js";import{T as Ie}from"./trash-2-BVa-3fJH.js";import{P as Oe}from"./pencil-CVHFNJTT.js";/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ae=oe("ImagePlus",[["path",{d:"M16 5h6",key:"1vod17"}],["path",{d:"M19 2v6",key:"4bpg5p"}],["path",{d:"M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5",key:"1ue2ih"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}]]);function We({items:a,defaultOpenIds:t=[],renderTitlePrefix:l}){const[p,c]=N.useState(new Set(t)),u=o=>c(f=>{const g=new Set(f);return g.has(o)?g.delete(o):g.add(o),g});return e.jsx("div",{className:"space-y-2",children:a.map((o,f)=>{const g=p.has(o.id);return e.jsxs("div",{className:D("rounded-2xl border border-token bg-[var(--card-2)]/40 overflow-hidden",g&&"bg-[var(--card-2)]"),children:[e.jsxs("button",{onClick:()=>u(o.id),className:"w-full flex items-start gap-3 p-3.5 text-left focus-ring",children:[l?e.jsx("div",{className:"flex-shrink-0",children:l(o,f)}):null,e.jsx("div",{className:"flex-1 min-w-0 text-sm font-bold leading-snug",children:o.title}),e.jsx(z.span,{animate:{rotate:g?180:0},className:"text-muted flex-shrink-0",children:e.jsx(le,{size:16})})]}),e.jsx(ce,{initial:!1,children:g&&e.jsx(z.div,{initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},transition:{duration:.22},className:"overflow-hidden",children:e.jsx("div",{className:"px-4 pb-4 text-sm text-muted leading-relaxed",children:o.body})})})]},o.id)})})}function Xe({projectId:a,project:t,projectState:l,stats:p}){const{profile:c}=de(),{updateProjectState:u}=re(),o=W(),[f,g]=N.useState("push"),[j,n]=N.useState(l.github||""),v=N.useMemo(()=>Ke({project:t,projectState:l,stats:p,profile:c}),[t,l,p,c]),_=N.useMemo(()=>t.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""),[t.title]),h=N.useMemo(()=>`feat: ${t.title.toLowerCase().split(" ")[0]} — ${t.tagline}`.slice(0,100),[t]),b=l.github,r=!!b&&/^https?:\/\//.test(b),k=async(s,i="Copied")=>{try{await navigator.clipboard.writeText(s),o.success(i)}catch{o.error("Could not copy — select and copy manually")}},x=()=>{const s=(j||"").trim();if(!s){u(a,{github:""}),o.info("GitHub URL cleared");return}if(!/^https?:\/\/(www\.)?github\.com\//i.test(s)){o.warning("Please paste a https://github.com/... URL");return}u(a,{github:s}),o.success("GitHub repository saved — green badge unlocked")},w=[{id:"push",label:"Push to GitHub",icon:F},{id:"readme",label:"README",icon:me},{id:"commands",label:"Git commands",icon:T},{id:"save",label:"Save repo URL",icon:xe}];return e.jsxs(z.section,{initial:{opacity:0,y:8},animate:{opacity:1,y:0},className:"surface rounded-2xl p-5 sm:p-6 gradient-border relative overflow-hidden",children:[e.jsx("div",{className:"absolute -top-24 -right-24 w-72 h-72 bg-aws-orange/10 rounded-full blur-3xl pointer-events-none"}),e.jsxs("div",{className:"relative",children:[e.jsxs("div",{className:"flex items-center justify-between gap-2 mb-3 flex-wrap",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(T,{size:16,className:"text-aws-orange"}),e.jsx("h3",{className:"text-[11px] font-extrabold uppercase tracking-widest",children:"GitHub integration"}),r&&e.jsxs("span",{className:"chip bg-success/15 text-success border border-success/30 text-[10px] font-extrabold",children:[e.jsx(L,{size:10})," Pushed to GitHub"]})]}),r&&e.jsxs("a",{href:b,target:"_blank",rel:"noreferrer",className:"inline-flex items-center gap-1 text-xs font-bold text-aws-orange hover:underline",children:[e.jsx(U,{size:11})," Open repo"]})]}),e.jsxs("p",{className:"text-xs text-muted leading-relaxed mb-3",children:["Your project is complete. Push it to GitHub so it actually counts toward your portfolio — recruiters and clients want to ",e.jsx("em",{children:"see the code"}),", not just the screenshot."]}),e.jsx("div",{className:"flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-[var(--card-2)] p-1 border border-token mb-3",children:w.map(s=>{const i=s.icon;return e.jsxs("button",{onClick:()=>g(s.id),className:D("inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition focus-ring",f===s.id?"bg-gradient-aws text-ink-950 shadow-glow-orange":"text-muted hover:text-current"),children:[e.jsx(i,{size:13})," ",s.label]},s.id)})}),f==="push"&&e.jsx(Ve,{project:t,projectState:l,readme:v,slug:_,profile:c,onSaved:s=>{n(s),u(a,{github:s})}}),f==="readme"&&e.jsx(Ye,{readme:v,onCopy:k}),f==="commands"&&e.jsx(qe,{slug:_,commitMsg:h,repoUrl:b,onCopy:k}),f==="save"&&e.jsx(Qe,{draftUrl:j,setDraftUrl:n,onSave:x,saved:r})]})]})}function Ve({project:a,projectState:t,readme:l,slug:p,profile:c,onSaved:u}){var S;const o=W(),{stageInQueue:f}=ue(),g=((S=c==null?void 0:c.integrations)==null?void 0:S.githubToken)||"",[j,n]=N.useState(Le(a.title)),[v,_]=N.useState(!0),[h,b]=N.useState(null),[r,k]=N.useState(!1),[x,w]=N.useState(null),s=N.useMemo(()=>{var y;const d=[{path:"README.md",content:l}];return(y=a.architecture)!=null&&y.svg&&d.push({path:"architecture.svg",content:a.architecture.svg}),(t.screenshots||[]).forEach((C,A)=>{const P=Ue(C.dataUrl);P&&d.push({path:`screenshots/screenshot-${A+1}.png`,content:P,isBinary:!0})}),d.push({path:".gitignore",content:["# OS",".DS_Store","Thumbs.db","","# Editors",".vscode/",".idea/","*.swp","","# Node / build","node_modules/","dist/","build/","","# Terraform",".terraform/","*.tfstate","*.tfstate.*","*.tfvars","","# Secrets","*.pem","*.key",".env",".env.*",""].join(`
`)}),d},[a,t,l]),i=N.useMemo(()=>{const d=new Set(["aws","cloud","portfolio"]);return(a.services||[]).forEach(y=>d.add(String(y).toLowerCase())),Array.from(d)},[a]),m=async()=>{if(!g){o.error("Add your GitHub token in Settings → Integrations first.");return}k(!0),w(null),b({stage:"start",message:"Starting…"});try{const d=await Me({token:g,repoName:j.trim(),description:a.tagline||a.summary||"",topics:i,isPublic:v,files:s,onProgress:(y,C)=>b({stage:y,message:C})});w(d),d.ok&&d.html_url?(u(d.html_url),o.success(`Pushed → ${d.full_name}`)):o.error("Push completed with errors — see details below.")}catch(d){o.error("Push failed — "+(d&&d.message||String(d)))}k(!1)};return g?e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"rounded-xl border border-aws-orange/30 bg-aws-orange/5 p-4 space-y-3",children:[e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx(F,{size:18,className:"text-aws-orange shrink-0 mt-0.5"}),e.jsxs("div",{className:"text-[12px] leading-relaxed",children:["One-click push: creates a new repo, uploads your README + architecture diagram + screenshots + .gitignore, and sets searchable topics. ",e.jsx("strong",{className:"text-current",children:"Zero terminal commands."})]})]}),e.jsxs("div",{className:"grid sm:grid-cols-[1fr_auto] gap-2 items-end",children:[e.jsxs("label",{className:"block",children:[e.jsx("span",{className:"text-[10px] font-bold text-muted",children:"Repo name"}),e.jsx("input",{value:j,onChange:d=>n(d.target.value),className:"mt-1 w-full bg-[var(--card)] border border-token rounded-md px-2 py-1.5 text-xs font-mono focus-ring focus:border-aws-orange"})]}),e.jsxs("label",{className:"flex items-center gap-1.5 text-[11px] font-bold",children:[e.jsx("input",{type:"checkbox",checked:v,onChange:d=>_(d.target.checked),className:"w-4 h-4 accent-aws-orange"}),e.jsx("span",{children:"Public repo (recommended for portfolio)"})]})]}),e.jsxs("div",{className:"text-[11px] text-muted",children:[e.jsx("strong",{className:"text-current",children:"Will push:"})," ",s.length," files"," · ",e.jsx("strong",{className:"text-current",children:"Topics:"})," ",i.join(", ")]}),e.jsxs("div",{className:"grid sm:grid-cols-[1fr_auto] gap-2",children:[e.jsx("button",{onClick:m,disabled:r||!j.trim(),className:D("btn btn-primary",(r||!j.trim())&&"opacity-50 cursor-not-allowed"),children:r?e.jsxs(e.Fragment,{children:[e.jsx(he,{size:14,className:"animate-spin"})," ",(h==null?void 0:h.message)||"Pushing…"]}):e.jsxs(e.Fragment,{children:[e.jsx(F,{size:14})," Push now"]})}),e.jsxs("button",{onClick:()=>{f({kind:"github-push",title:`Push: ${j}`,body:`Repo: ${j}
Visibility: ${v?"public":"private"}
Files: ${s.length}
Topics: ${i.join(", ")}

When ready, open this project (${a.title}) → GitHub integration → "Push now".`,meta:{repoName:j,isPublic:v,projectId:t.id,projectTitle:a.title,topics:i},sourceId:t.id,status:"ready"}),o.success("Staged in Content Queue — push it whenever you're ready")},disabled:!j.trim(),className:"btn btn-ghost",title:"Don't push yet — save the plan to the Content Queue and push later",children:[e.jsx(M,{size:14})," Stage for later"]})]})]}),h&&!r&&e.jsxs("div",{className:"text-[10px] text-muted",children:["Last status: ",e.jsx("span",{className:"text-current",children:h.message})]}),x&&e.jsx("div",{className:D("rounded-xl border p-3",x.ok?"border-success/30 bg-success/10":"border-warning/30 bg-warning/10"),children:e.jsxs("div",{className:"flex items-start gap-2.5",children:[x.ok?e.jsx(L,{size:14,className:"text-success shrink-0 mt-0.5"}):e.jsx(O,{size:14,className:"text-warning shrink-0 mt-0.5"}),e.jsx("div",{className:"text-[12px] leading-relaxed flex-1",children:x.ok?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"font-extrabold text-success",children:"Pushed!"}),e.jsxs("a",{href:x.html_url,target:"_blank",rel:"noreferrer",className:"text-aws-orange font-bold hover:underline inline-flex items-center gap-1",children:[e.jsx(U,{size:11})," ",x.full_name]}),e.jsxs("div",{className:"mt-1 text-[11px] text-muted",children:[(x.files||[]).length," files uploaded."]})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"font-extrabold text-warning",children:"Push completed with issues"}),e.jsx("ul",{className:"mt-1 space-y-0.5 text-[11px]",children:(x.errors||[]).map((d,y)=>e.jsxs("li",{children:["• ",d.stage,d.path?` (${d.path})`:"",": ",d.message]},y))})]})})]})})]}):e.jsx("div",{className:"space-y-3",children:e.jsxs("div",{className:"rounded-xl border border-warning/40 bg-warning/10 p-4 space-y-2",children:[e.jsxs("div",{className:"text-sm font-extrabold text-warning inline-flex items-center gap-2",children:[e.jsx(O,{size:14})," GitHub token not configured"]}),e.jsxs("p",{className:"text-[12px] leading-relaxed",children:["To push directly from this app, you need a GitHub Personal Access Token. It's a 60-second setup: ",e.jsx("a",{href:"/settings",className:"text-aws-orange font-bold hover:underline",children:"open Settings → Integrations → GitHub push integration"}),". Until then, use the ",e.jsx("strong",{children:"README"})," + ",e.jsx("strong",{children:"Git commands"})," tabs above for the manual flow."]})]})})}function Ye({readme:a,onCopy:t}){return e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsxs("span",{className:"text-[10px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1.5",children:[e.jsx(pe,{size:11})," Auto-generated from your project data"]}),e.jsxs("button",{onClick:()=>t(a,"README copied — paste into README.md"),className:"btn btn-primary !text-xs !py-1.5",children:[e.jsx(I,{size:12})," Copy full README"]})]}),e.jsx("pre",{className:"rounded-xl border border-token bg-[var(--card-2)]/40 p-3 text-[11px] font-mono leading-relaxed whitespace-pre-wrap max-h-[480px] overflow-y-auto",children:a})]})}function qe({slug:a,commitMsg:t,repoUrl:l,onCopy:p}){const c=l||`git@github.com:YOUR_USERNAME/${a}.git`,u=[{n:1,title:"Initialize the repo",cmd:"git init",hint:"Run this in the project root folder."},{n:2,title:"Stage everything",cmd:"git add .",hint:"Tip: keep a .gitignore with /node_modules, /.terraform, *.tfstate, .env BEFORE this step."},{n:3,title:"First commit",cmd:`git commit -m "${t}"`,hint:"Conventional-commits prefix (feat/fix/docs/chore) reads well on GitHub."},{n:4,title:"Add your GitHub remote",cmd:`git remote add origin ${c}`,hint:"Create the repo on github.com first — it can be empty."},{n:5,title:"Push to main",cmd:"git push -u origin main",hint:"If your default branch is master: git push -u origin master."}];return e.jsxs("div",{className:"space-y-2",children:[e.jsx("p",{className:"text-xs text-muted mb-1",children:"Copy each step in order. Total time: about 90 seconds for a new repo."}),u.map(o=>e.jsx("div",{className:"surface-2 rounded-xl p-3.5",children:e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("span",{className:"w-7 h-7 rounded-lg bg-gradient-aws text-ink-950 grid place-items-center font-black text-xs flex-shrink-0",children:o.n}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsx("h4",{className:"text-sm font-extrabold",children:o.title}),e.jsxs("button",{onClick:()=>p(o.cmd),className:"btn btn-ghost !text-[11px] !py-1",children:[e.jsx(I,{size:11})," Copy"]})]}),e.jsx("pre",{className:"mt-1.5 rounded-md bg-[var(--card)] border border-token px-2.5 py-1.5 text-[11px] font-mono leading-relaxed overflow-x-auto",children:o.cmd}),o.hint&&e.jsx("p",{className:"mt-1.5 text-[11px] text-muted leading-relaxed",children:o.hint})]})]})},o.n)),e.jsxs("div",{className:"rounded-xl border border-electric/30 bg-electric/[0.04] p-3 mt-2",children:[e.jsxs("div",{className:"text-[10px] font-extrabold uppercase tracking-widest text-electric mb-1 flex items-center gap-1.5",children:[e.jsx(M,{size:11})," One-shot version"]}),e.jsx("p",{className:"text-xs text-muted leading-relaxed mb-2",children:"Paste this whole block into one terminal session after you create the GitHub repo:"}),e.jsx("pre",{className:"rounded-md bg-[var(--card)] border border-token px-3 py-2 text-[11px] font-mono leading-relaxed overflow-x-auto",children:`git init
git add .
git commit -m "${t}"
git remote add origin ${c}
git push -u origin main`}),e.jsxs("button",{onClick:()=>p(`git init
git add .
git commit -m "${t}"
git remote add origin ${c}
git push -u origin main`,"One-shot script copied"),className:"btn btn-ghost !text-[11px] !py-1.5 mt-2",children:[e.jsx(I,{size:11})," Copy one-shot"]})]})]})}function Qe({draftUrl:a,setDraftUrl:t,onSave:l,saved:p}){return e.jsxs("div",{className:"space-y-3",children:[e.jsxs("label",{className:"block",children:[e.jsxs("span",{className:"text-[10px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1.5",children:[e.jsx(T,{size:11,className:"text-aws-orange"})," Paste your GitHub repository URL"]}),e.jsxs("div",{className:"mt-1.5 flex flex-wrap gap-2",children:[e.jsx("input",{value:a,onChange:c=>t(c.target.value),placeholder:"https://github.com/your-handle/your-repo",onKeyDown:c=>{c.key==="Enter"&&l()},className:"flex-1 min-w-[260px] bg-[var(--card-2)] border border-token rounded-xl px-3 py-2.5 text-sm font-semibold focus-ring focus:border-aws-orange font-mono"}),e.jsxs("button",{onClick:l,className:"btn btn-primary",children:[e.jsx(L,{size:14})," Save"]})]})]}),!p&&e.jsxs("div",{className:"rounded-xl border border-warning/30 bg-warning/[0.04] p-3 flex items-start gap-2",children:[e.jsx(O,{size:14,className:"text-warning flex-shrink-0 mt-0.5"}),e.jsx("p",{className:"text-xs text-muted leading-relaxed",children:"Once saved, this URL appears on the portfolio card (with a green GitHub badge), on your shared portfolio page, and inside every proposal you generate for similar work."})]}),p&&e.jsx("div",{className:"rounded-xl border border-success/30 bg-success/[0.04] p-3",children:e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(L,{size:14,className:"text-success flex-shrink-0 mt-0.5"}),e.jsxs("div",{className:"flex-1 text-xs",children:[e.jsx("strong",{className:"text-success",children:"Saved."})," Your project card now has a GitHub badge. Open the repo any time:",e.jsx("div",{className:"mt-1.5",children:e.jsx("a",{href:a,target:"_blank",rel:"noreferrer",className:"text-aws-orange font-bold font-mono break-all hover:underline",children:a})})]})]})})]})}function Ke({project:a,projectState:t,stats:l,profile:p}){var x,w,s,i;const c=(a.services||[]).map(m=>`![${m}](https://img.shields.io/badge/${E(m).label.replace(/\s/g,"%20")}-FF9900?style=flat-square&logo=amazonaws&logoColor=white)`).join(" "),u=(a.prerequisites||[]).map(m=>`- ${m}`).join(`
`),o=(a.buildSteps||[]).slice(0,5).map((m,S)=>{var d;return`${S+1}. **${m.title}**${(d=m.subs)!=null&&d.length?`
   `+m.subs.slice(0,4).map(y=>`- ${y.title}`).join(`
   `):""}`}).join(`
`),f=(((x=a.architecture)==null?void 0:x.nodes)||[]).map(m=>`- **${m.label}** ${m.service?`· \`${E(m.service).label}\``:""}`).join(`
`),g=(((w=a.architecture)==null?void 0:w.edges)||[]).map(m=>{var y,C;const S=(y=a.architecture.nodes.find(A=>A.id===m.from))==null?void 0:y.label,d=(C=a.architecture.nodes.find(A=>A.id===m.to))==null?void 0:C.label;return`- ${S} → ${d}${m.label?` (\`${m.label}\`)`:""}`}).join(`
`),j=Ze(a),n=Je(a),v=a.costNotes||(a.freeTier?"**Free Tier eligible.** Under $5/mo at low traffic.":"Variable — see AWS Pricing Calculator."),_=(t.lessons||"").trim()||"_Add your own — what surprised you, what would you change?_",h=(a.certs||[]).join(" · "),b=t.finishedAt?new Date(t.finishedAt).toLocaleDateString():new Date().toLocaleDateString(),r=(p==null?void 0:p.integrations)||{},k=[`**${(p==null?void 0:p.name)||"Cloud Engineer"}**`,r.linkedin?`[LinkedIn](${r.linkedin})`:null,r.github?`[GitHub](${r.github})`:null,r.hashnode?`[Blog](${r.hashnode})`:null].filter(Boolean).join(" · ");return`# ${a.title} — AWS Portfolio Project

${c}

> ${a.tagline}

## 📋 Overview

${a.summary||a.tagline}

Built as part of an AWS Solutions Architect portfolio. Demonstrates ${(s=a.skills)==null?void 0:s.slice(0,3).join(", ")}${((i=a.skills)==null?void 0:i.length)>3?", and more":""}.

**Difficulty:** ${a.difficulty} · **Estimated time:** ${a.estLabel} · **Completed:** ${b}

## 🏗️ Architecture

${f||"_See diagram in repo._"}

**Data flow:**
${g||"_See diagram in repo._"}

## ☁️ AWS Services Used

${(a.services||[]).map(m=>`- **${E(m).label}** — ${E(m).domain}`).join(`
`)}

## ✅ Prerequisites

${u||`- AWS account with appropriate IAM permissions
- Familiarity with the AWS console`}

## 🚀 How to Deploy

### Console method (point-and-click)

${o||"_Walk through the AWS console step by step._"}

### CLI method (one terminal session)

\`\`\`bash
${j}
\`\`\`

### Terraform method (infrastructure as code)

\`\`\`hcl
${n}
\`\`\`

Then:

\`\`\`bash
terraform init
terraform plan
terraform apply -auto-approve
\`\`\`

## 🧪 Testing Results

${(l==null?void 0:l.doneSteps)!==void 0?`- ✅ ${l.doneSteps} of ${l.totalSteps} build-guide steps completed
- ✅ Deployment verified end-to-end
- ✅ Cleanup procedure documented`:`- ✅ Deployment verified end-to-end
- ✅ Cleanup procedure documented`}

## 💰 Estimated Monthly Cost

${v}

## 📚 Lessons Learned

${_}

## 🎯 Skills Demonstrated

${(a.skills||[]).map(m=>`- ${m}`).join(`
`)}

## 🏆 Related Certifications

${h?`Skills practiced here directly support: **${h}**.`:"_See AWS certification mapping._"}

## 🧹 Cleanup

To avoid ongoing charges:

\`\`\`bash
# If you used Terraform:
terraform destroy -auto-approve

# Or manually delete via the AWS console — start with the resources that incur hourly charges first.
\`\`\`

## 👤 Author

${k}

---

_Built with the AWS Career Launchpad Pro portfolio workflow._
`}function Ze(a){const t=new Set(a.services||[]);return t.has("s3")&&t.has("cloudfront")?`# Create bucket and enable website hosting
aws s3api create-bucket --bucket my-portfolio-site-\${RANDOM} --region us-east-1
aws s3 website s3://my-portfolio-site-\${RANDOM}/ --index-document index.html
aws s3 cp ./dist/ s3://my-portfolio-site-\${RANDOM}/ --recursive

# Create CloudFront distribution (use the AWS console for first setup)
aws cloudfront create-distribution --distribution-config file://cf-config.json`:t.has("lambda")&&t.has("apigateway")?`# Package and deploy the Lambda
zip -r function.zip .
aws lambda create-function \\
  --function-name myFn \\
  --runtime nodejs20.x \\
  --role arn:aws:iam::\${ACCOUNT_ID}:role/lambda-exec \\
  --handler index.handler \\
  --zip-file fileb://function.zip

# Wire it to API Gateway
aws apigatewayv2 create-api --name myApi --protocol-type HTTP \\
  --target arn:aws:lambda:us-east-1:\${ACCOUNT_ID}:function:myFn`:t.has("vpc")||t.has("ec2")?`# Create VPC + subnet + IGW
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id vpc-XXX --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --vpc-id vpc-XXX --internet-gateway-id igw-XXX

# Launch t2.micro
aws ec2 run-instances --image-id ami-XXX --instance-type t2.micro \\
  --subnet-id subnet-XXX --key-name my-key`:`# Verify your identity
aws sts get-caller-identity

# Inspect resources (adjust service per project)
aws ec2 describe-vpcs
aws s3 ls
aws rds describe-db-instances`}function Je(a){const t=new Set(a.services||[]);return t.has("s3")&&t.has("cloudfront")?`terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}

provider "aws" { region = "us-east-1" }

resource "aws_s3_bucket" "site" {
  bucket = "my-portfolio-site-\${random_id.suffix.hex}"
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id   = "s3-site"
  }
  default_cache_behavior {
    target_origin_id       = "s3-site"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
  }
  enabled             = true
  default_root_object = "index.html"
  viewer_certificate { cloudfront_default_certificate = true }
  restrictions { geo_restriction { restriction_type = "none" } }
}

resource "random_id" "suffix" { byte_length = 4 }`:t.has("lambda")&&t.has("apigateway")?`resource "aws_lambda_function" "fn" {
  filename      = "function.zip"
  function_name = "myFn"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
}

resource "aws_apigatewayv2_api" "api" {
  name          = "myApi"
  protocol_type = "HTTP"
  target        = aws_lambda_function.fn.arn
}

resource "aws_iam_role" "lambda" {
  name = "lambda-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}`:t.has("vpc")||t.has("ec2")?`module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  name   = "portfolio-vpc"
  cidr   = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}

resource "aws_instance" "web" {
  ami           = "ami-0c02fb55956c7d316"
  instance_type = "t2.micro"
  subnet_id     = module.vpc.public_subnets[0]
}`:`# Replace the modules below with the services specific to your project
terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}

provider "aws" { region = "us-east-1" }

# … add resource blocks per service used`}function es({architecture:a,className:t=""}){const{nodes:l,edges:p}=a,c=132,u=52,o=l.map(r=>r.x),f=l.map(r=>r.y),g=Math.min(...o)-c/2-16,j=Math.max(...o)+c/2+16,n=Math.min(...f)-u/2-24,v=Math.max(...f)+u/2+24,_=Object.fromEntries(l.map(r=>[r.id,r])),h=`arrow-${Math.random().toString(36).slice(2,8)}`,b=`${h}-d`;return e.jsx("div",{className:`w-full overflow-x-auto -mx-2 px-2 ${t}`,children:e.jsxs("svg",{viewBox:`${g} ${n} ${j-g} ${v-n}`,preserveAspectRatio:"xMidYMid meet",className:"w-full min-w-[640px] max-h-[360px]",children:[e.jsxs("defs",{children:[e.jsx("marker",{id:h,viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"6",markerHeight:"6",orient:"auto",children:e.jsx("path",{d:"M0,0 L10,5 L0,10 z",fill:"#FF9900"})}),e.jsx("marker",{id:b,viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"6",markerHeight:"6",orient:"auto",children:e.jsx("path",{d:"M0,0 L10,5 L0,10 z",fill:"#94A3B8"})}),e.jsxs("linearGradient",{id:"grad-card",x1:"0%",y1:"0%",x2:"0%",y2:"100%",children:[e.jsx("stop",{offset:"0%",stopColor:"rgba(255,255,255,0.05)"}),e.jsx("stop",{offset:"100%",stopColor:"rgba(255,255,255,0.0)"})]})]}),p.map((r,k)=>{const x=_[r.from],w=_[r.to];if(!x||!w)return null;const s=x.x,i=x.y,m=w.x,S=w.y,d=(s+m)/2,y=(i+S)/2,C=m-s,A=S-i,P=Math.sqrt(C*C+A*A)||1,X=C/P*(c/2),V=A/P*(u/2),ie=`M ${s+X} ${i+V} Q ${d} ${y} ${m-X} ${S-V}`,ne=r.dashed?b:h;return e.jsxs("g",{children:[e.jsx(z.path,{initial:{pathLength:0,opacity:0},animate:{pathLength:1,opacity:1},transition:{duration:.7,delay:.1+k*.04,ease:"easeOut"},d:ie,fill:"none",stroke:r.dashed?"#94A3B8":"#FF9900",strokeWidth:1.8,strokeDasharray:r.dashed?"5 5":void 0,strokeLinecap:"round",markerEnd:`url(#${ne})`}),r.label&&e.jsx("text",{x:d,y:y-6,textAnchor:"middle",className:"fill-current",style:{fontSize:10,fontWeight:700,fill:r.dashed?"#94A3B8":"#FF9900"},children:r.label})]},k)}),l.map((r,k)=>{const x=r.service?E(r.service):null,w=(x==null?void 0:x.color)||"#94A3B8";return e.jsxs(z.g,{initial:{opacity:0,y:6},animate:{opacity:1,y:0},transition:{delay:.05+k*.04},transform:`translate(${r.x-c/2}, ${r.y-u/2})`,children:[e.jsx("rect",{width:c,height:u,rx:10,fill:"var(--card)",stroke:w,strokeWidth:1.5}),e.jsx("rect",{width:c,height:u,rx:10,fill:"url(#grad-card)"}),e.jsx("circle",{cx:16,cy:u/2,r:5,fill:w}),r.icon?e.jsx("text",{x:c/2,y:u/2+2,textAnchor:"middle",style:{fontSize:18},children:r.icon}):e.jsx("text",{x:32,y:u/2+4,style:{fontSize:11.5,fontWeight:800,fill:"var(--text)"},children:(x==null?void 0:x.label)||r.label}),r.icon&&e.jsx("text",{x:c/2,y:u-6,textAnchor:"middle",style:{fontSize:9,fontWeight:700,fill:"var(--text-2)",textTransform:"uppercase",letterSpacing:1},children:r.label})]},r.id)})]})})}function xs(){const{projectId:a}=ge(),t=be(a);fe();const l=W(),{getProjectState:p,updateProjectState:c,moveToStatus:u,toggleStep:o,addScreenshot:f,removeScreenshot:g,projectStats:j}=re(),n=p(a),v=j.find(s=>s.id===a),_=N.useRef(null),[h,b]=N.useState({notes:n.notes,lessons:n.lessons,wouldDoDifferently:n.wouldDoDifferently,github:n.github,demoUrl:n.demoUrl,videoUrl:n.videoUrl});if(N.useEffect(()=>{b({notes:n.notes,lessons:n.lessons,wouldDoDifferently:n.wouldDoDifferently,github:n.github,demoUrl:n.demoUrl,videoUrl:n.videoUrl})},[a]),!t)return e.jsxs("div",{className:"surface rounded-3xl p-12 text-center",children:[e.jsx("div",{className:"text-2xl mb-2",children:"🤷"}),e.jsx("h2",{className:"text-xl font-bold",children:"Project not found"}),e.jsxs(Y,{to:"/portfolio",className:"mt-4 inline-flex items-center gap-1 text-aws-orange font-semibold hover:underline",children:[e.jsx(q,{size:14})," Back to portfolio"]})]});const r=Q[n.status],k=K[n.priority],x=(s,i)=>c(a,{[s]:i}),w=async s=>{if(!(!s||s.length===0)){for(const i of s)await f(a,i);l.success(`${s.length} screenshot${s.length>1?"s":""} added`)}};return e.jsxs("div",{className:"space-y-6",children:[e.jsxs(Y,{to:"/portfolio",className:"inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange transition print:hidden",children:[e.jsx(q,{size:14})," Portfolio board"]}),e.jsxs(z.section,{initial:{opacity:0,y:8},animate:{opacity:1,y:0},className:"relative surface rounded-3xl p-6 sm:p-8 lg:p-10 gradient-border overflow-hidden",children:[e.jsx("div",{className:"absolute -top-24 -right-24 w-72 h-72 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none"}),e.jsxs("div",{className:"relative grid gap-6 lg:grid-cols-[1fr_240px] items-start",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsx("span",{className:"w-10 h-10 rounded-xl bg-gradient-aws grid place-items-center text-ink-950 font-black text-sm shadow-glow-orange",children:t.n}),e.jsxs("span",{className:D("chip border text-[11px]",k.color),children:[k.label," priority"]}),e.jsxs("span",{className:D("chip text-[11px]",r.color),children:[r.emoji," ",r.label]})]}),e.jsx("h1",{className:"text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.05]",children:t.title}),e.jsx("p",{className:"mt-2 text-base text-muted leading-relaxed max-w-3xl",children:t.tagline}),e.jsxs("div",{className:"mt-5 flex flex-wrap items-center gap-4",children:[e.jsx(Te,{level:t.difficulty,size:"md"}),e.jsx(Re,{value:t.clientAppeal,size:"md"}),e.jsxs("span",{className:"inline-flex items-center gap-1.5 text-xs font-semibold text-muted",children:[e.jsx(Z,{size:14})," ",t.estLabel]}),t.freeTier&&e.jsx("span",{className:"chip bg-success/10 text-success border border-success/30",children:"Free-tier eligible"})]}),t.standout&&e.jsx("div",{className:"mt-5 rounded-2xl border border-aws-orange/40 bg-aws-orange/10 p-4",children:e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx(M,{size:18,className:"text-aws-orange mt-0.5"}),e.jsxs("div",{children:[e.jsx("div",{className:"text-xs font-extrabold uppercase tracking-widest text-aws-orange",children:"Your strongest project"}),e.jsx("p",{className:"text-sm mt-1 leading-relaxed",children:t.standout})]})]})}),e.jsxs("div",{className:"mt-6 flex flex-wrap gap-2 print:hidden",children:[e.jsx("select",{value:n.status,onChange:s=>{u(a,s.target.value),s.target.value==="complete"&&ve({origin:{y:.35}})},className:"bg-[var(--card-2)] border border-token rounded-xl px-3 py-2 text-sm font-bold focus-ring focus:border-aws-orange",children:je.map(s=>e.jsx("option",{value:s,children:Q[s].label},s))}),e.jsx("select",{value:n.priority,onChange:s=>c(a,{priority:s.target.value}),className:"bg-[var(--card-2)] border border-token rounded-xl px-3 py-2 text-sm font-bold focus-ring focus:border-aws-orange",children:Object.entries(K).map(([s,i])=>e.jsx("option",{value:s,children:i.label},s))}),n.github&&e.jsx(J,{as:"a",href:n.github,target:"_blank",variant:"ghost",icon:T,children:"GitHub"}),n.demoUrl&&e.jsx(J,{as:"a",href:n.demoUrl,target:"_blank",variant:"ghost",icon:U,children:"Live demo"})]})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsx(R,{icon:ee,label:"Build steps",value:`${v.doneSteps}/${v.totalSteps}`}),e.jsx(R,{icon:Z,label:"Started",value:n.startedAt?se(n.startedAt):"—"}),e.jsx(R,{icon:we,label:"Finished",value:n.finishedAt?se(n.finishedAt):"—"}),e.jsx(R,{icon:ye,label:"Client appeal",value:`${t.clientAppeal}/10`})]})]})]}),e.jsxs("div",{className:"grid gap-6 lg:grid-cols-2",children:[e.jsxs($,{title:"Business case",icon:Ge,children:[e.jsx("p",{className:"text-sm leading-relaxed",children:t.businessCase}),e.jsxs("div",{className:"mt-4",children:[e.jsx("div",{className:"text-[11px] font-extrabold uppercase tracking-widest text-muted mb-2",children:"Real companies using this pattern"}),e.jsx("div",{className:"flex flex-wrap gap-2",children:t.companies.map(s=>e.jsxs("span",{className:"inline-flex items-center gap-1.5 chip bg-[var(--card-2)] border border-token text-xs font-bold",children:[e.jsx("span",{className:"w-5 h-5 rounded-md bg-gradient-aws text-ink-950 grid place-items-center text-[10px] font-black",children:s.charAt(0)}),s]},s))})]})]}),e.jsxs($,{title:"Architecture",icon:Ne,children:[e.jsx(es,{architecture:t.architecture}),e.jsx("div",{className:"mt-4 flex flex-wrap gap-1.5",children:t.services.map(s=>e.jsx(Be,{id:s,size:"sm",linkTo:`https://docs.aws.amazon.com/index.html?search=${encodeURIComponent(s)}`},s))})]})]}),e.jsxs("div",{className:"grid gap-6 lg:grid-cols-2",children:[e.jsx($,{title:"Prerequisites",icon:ke,children:e.jsx("ul",{className:"space-y-2 text-sm",children:t.prerequisites.map(s=>e.jsxs("li",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-aws-orange mt-1.5 flex-shrink-0"}),e.jsx("span",{children:s})]},s))})}),e.jsxs($,{title:"Skills you'll gain",icon:te,children:[e.jsx("div",{className:"flex flex-wrap gap-1.5",children:t.skills.map(s=>e.jsx("span",{className:"chip bg-[var(--card-2)] border border-token text-xs font-bold",children:s},s))}),e.jsxs("div",{className:"mt-4",children:[e.jsx("div",{className:"text-[11px] font-extrabold uppercase tracking-widest text-muted mb-2",children:"Related certifications"}),e.jsx("div",{className:"flex flex-wrap gap-1.5",children:t.certs.map(s=>e.jsxs("span",{className:"inline-flex items-center gap-1 chip bg-aws-orange/10 text-aws-orange border border-aws-orange/30 text-xs font-bold",children:[e.jsx(te,{size:11})," ",s]},s))})]})]})]}),t.id==="p-s3-cf"&&e.jsxs($,{title:"Smart method detector",icon:M,children:[e.jsx("p",{className:"text-xs text-muted mb-3 leading-relaxed",children:"For each step, pick the method that fits the situation. The recommendation is highlighted with an orange dot — Terraform is the default for portable, client-rebuildable infrastructure."}),e.jsx($e,{title:B.title,signal:B.signal,content:B.content})]}),e.jsx($,{title:`Build guide (${v.doneSteps}/${v.totalSteps} done)`,icon:ee,children:e.jsx("ol",{className:"space-y-2.5",children:t.buildSteps.map((s,i)=>{const m=!!n.completedSteps[s.id];return e.jsx("li",{className:D("rounded-2xl border p-3.5 transition",m?"border-success/40 bg-success/[0.04]":"border-token bg-[var(--card-2)]/40"),children:e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx(Se,{checked:m,onChange:()=>o(a,s.id),size:20}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"flex items-baseline gap-2",children:e.jsxs("span",{className:"text-[10px] font-extrabold uppercase tracking-widest text-aws-orange",children:["Step ",i+1]})}),e.jsx("h4",{className:D("text-sm font-bold leading-snug",m&&"line-through text-muted"),children:s.title}),e.jsx(_e,{step:s,defaultOpen:!0}),e.jsxs("div",{className:"mt-3 rounded-xl border border-token bg-[var(--card)] p-3",children:[e.jsxs("div",{className:"text-[10px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1 mb-2",children:[e.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-aws-orange"}),"Substeps for this step"]}),e.jsx("ul",{className:"space-y-1.5 text-xs",children:s.subs.map(S=>e.jsxs("li",{className:"flex items-start gap-2 text-muted",children:[e.jsx("span",{className:"w-1 h-1 rounded-full bg-aws-orange mt-1.5 flex-shrink-0"}),e.jsx("span",{children:S.title})]},S.id))})]})]})]})},s.id)})})}),e.jsx($,{title:"Common errors & fixes",icon:Ce,children:e.jsx(We,{items:t.commonErrors.map((s,i)=>({id:`err-${i}`,title:s.problem,body:e.jsx("p",{children:s.fix})})),renderTitlePrefix:(s,i)=>e.jsx("span",{className:"w-7 h-7 rounded-lg bg-danger/15 text-danger grid place-items-center font-extrabold text-xs",children:i+1})})}),e.jsx($,{title:"How to present this to clients",icon:Ae,children:e.jsx("ul",{className:"grid gap-2 sm:grid-cols-2",children:t.presentation.map((s,i)=>e.jsxs("li",{className:"rounded-2xl border border-token bg-[var(--card-2)]/40 p-3 flex items-start gap-2.5",children:[e.jsx(De,{size:14,className:"text-aws-orange fill-aws-orange mt-0.5 flex-shrink-0"}),e.jsx("span",{className:"text-sm leading-relaxed",children:s})]},i))})}),e.jsxs("div",{className:"grid gap-6 lg:grid-cols-2",children:[e.jsx($,{title:"Links",icon:He,children:e.jsxs("div",{className:"space-y-3",children:[e.jsx(G,{label:"GitHub repo",icon:T,placeholder:"https://github.com/you/aws-project",value:h.github,onChange:s=>b(i=>({...i,github:s})),onBlur:()=>x("github",h.github)}),e.jsx(G,{label:"Live demo URL",icon:U,placeholder:"https://demo.example.com",value:h.demoUrl,onChange:s=>b(i=>({...i,demoUrl:s})),onBlur:()=>x("demoUrl",h.demoUrl)}),e.jsx(G,{label:"Video walkthrough",icon:Fe,placeholder:"https://youtu.be/…",value:h.videoUrl,onChange:s=>b(i=>({...i,videoUrl:s})),onBlur:()=>x("videoUrl",h.videoUrl)})]})}),e.jsx($,{title:`Screenshot gallery (${n.screenshots.length})`,icon:ae,children:e.jsxs("div",{className:"grid grid-cols-2 sm:grid-cols-3 gap-2",children:[n.screenshots.map(s=>e.jsxs("div",{className:"relative group rounded-xl overflow-hidden border border-token aspect-video",children:[e.jsx("img",{src:s.dataUrl,alt:s.caption,className:"w-full h-full object-cover"}),e.jsx("button",{onClick:()=>g(a,s.id),className:"absolute top-1 right-1 grid place-items-center w-6 h-6 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition focus-ring","aria-label":"Remove",children:e.jsx(Ie,{size:12})})]},s.id)),e.jsx("button",{onClick:()=>{var s;return(s=_.current)==null?void 0:s.click()},className:"aspect-video rounded-xl border-2 border-dashed border-token grid place-items-center text-muted hover:border-aws-orange hover:text-aws-orange transition focus-ring",children:e.jsxs("div",{className:"text-center",children:[e.jsx(ae,{size:20,className:"mx-auto"}),e.jsx("div",{className:"text-[10px] font-bold mt-1",children:"Add image"})]})}),e.jsx("input",{ref:_,type:"file",accept:"image/*",multiple:!0,className:"hidden",onChange:s=>w(s.target.files)})]})})]}),e.jsxs("div",{className:"grid gap-6 lg:grid-cols-3",children:[e.jsx($,{title:"Notes",icon:ze,children:e.jsx(H,{value:h.notes,onChange:s=>b(i=>({...i,notes:s})),onBlur:()=>x("notes",h.notes),placeholder:"Anything worth remembering about this build…",rows:8})}),e.jsx($,{title:"Lessons learned",icon:Pe,children:e.jsx(H,{value:h.lessons,onChange:s=>b(i=>({...i,lessons:s})),onBlur:()=>x("lessons",h.lessons),placeholder:"What surprised you? What clicked?",rows:8})}),e.jsx($,{title:"What I'd do differently",icon:Oe,children:e.jsx(H,{value:h.wouldDoDifferently,onChange:s=>b(i=>({...i,wouldDoDifferently:s})),onBlur:()=>x("wouldDoDifferently",h.wouldDoDifferently),placeholder:"Rewind to day 1 — what would you change?",rows:8})})]}),e.jsx($,{title:"Cost estimate",icon:Ee,children:e.jsx("p",{className:"text-sm leading-relaxed",children:t.costNotes})}),(n.status==="complete"||!!n.github)&&e.jsx(Xe,{projectId:a,project:t,projectState:n,stats:v})]})}function $({title:a,icon:t,children:l}){return e.jsxs(z.section,{initial:{opacity:0,y:8},animate:{opacity:1,y:0},className:"surface rounded-2xl p-5 sm:p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[t?e.jsx(t,{size:16,className:"text-aws-orange"}):null,e.jsx("h3",{className:"text-sm font-extrabold uppercase tracking-widest",children:a})]}),l]})}function R({icon:a,label:t,value:l}){return e.jsxs("div",{className:"rounded-2xl border border-token bg-[var(--card-2)]/40 p-3",children:[e.jsxs("div",{className:"flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-muted",children:[e.jsx(a,{size:12,className:"text-aws-orange"})," ",t]}),e.jsx("div",{className:"mt-1 text-lg font-extrabold tracking-tight tabular-nums",children:l})]})}function G({label:a,icon:t,value:l,onChange:p,onBlur:c,placeholder:u}){return e.jsxs("label",{className:"block",children:[e.jsxs("span",{className:"text-[11px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1.5",children:[t?e.jsx(t,{size:12}):null," ",a]}),e.jsx("input",{value:l,onChange:o=>p(o.target.value),onBlur:c,placeholder:u,className:"mt-1.5 w-full bg-[var(--card-2)] border border-token rounded-xl px-3 py-2.5 text-sm focus-ring focus:border-aws-orange"})]})}function H({value:a,onChange:t,onBlur:l,placeholder:p,rows:c}){return e.jsx("textarea",{value:a,onChange:u=>t(u.target.value),onBlur:l,placeholder:p,rows:c,className:"w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-sm leading-relaxed focus-ring focus:border-aws-orange resize-y"})}export{xs as default};
