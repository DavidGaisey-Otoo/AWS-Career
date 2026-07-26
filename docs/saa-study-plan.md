# How to actually pass SAA-C03 with what you now have

You have three tools and they do different jobs. Most people fail not because
they lack material but because they use one tool for everything.

| Tool | What it is genuinely good at | What it cannot do |
|---|---|---|
| **The app** | Reps, tracking, spaced repetition, weakness detection, readiness scoring | Explain a question you don't understand |
| **Claude Project** | Explaining, exam technique, unlimited fresh questions, Socratic pressure | Remember your progress between chats |
| **Course slides** | Learning a topic properly the first time | Test whether you actually learned it |

The loop that works: **slides teach it → app tests it → Claude fixes what the app
says you got wrong.** Each hands off to the next.

---

## Before you start: two decisions

**1. Set your exam date in the app.** Home → Daily Plan → set the date and your
hours per day. Everything else — the daily plan, the readiness score, the
countdown — keys off that. An unbooked exam drifts forever; a booked one
concentrates the mind. Pick a date 8–10 weeks out and put it in.

**2. Take a cold 20-question mock today.** Exam → SAA-C03 → 20 questions.
You will score badly and that is the point: it establishes a baseline and shows
you which domains are worst before you have any sunk cost in a study order.

---

## The 8 phases are already in the app

Build → SAA-C03 Roadmap. Eight phases, ordered so nothing depends on something
you haven't covered. Every one of the 47 services now links to a study guide
(that was broken until recently — 14 led nowhere).

| Phase | Weeks | Focus |
|---|---|---|
| 1 | 1–2 | Foundation — IAM, EC2, S3, VPC |
| 2 | 3 | Storage + Databases |
| 3 | 4 | Elastic Compute |
| 4 | 5 | Networking + Edge |
| 5 | 6 | Security Deep Dive |
| 6 | 7 | Integration + Monitoring |
| 7 | 8 | Cost + Well-Architected |
| 8 | 9+ | Final Sprint |

**Do not reorder these.** Phase 1 is longer than it looks like it needs to be,
deliberately — AWS hangs off IAM and VPC, and skipping them makes every later
topic feel arbitrary.

---

## Your daily session (60–90 minutes)

Work one phase at a time. Within a phase, per service:

**1. Learn it (25 min).** Read the app's study guide for that service, then the
matching section of your course slides. Guide first — it is shorter and gives
you the shape, so the slides fill in rather than overwhelm.

**2. Drill it (20 min).** Exam → Practice → filter to that service. Wrong
answers matter more than the score. Read the "why each wrong option is wrong"
on every single question, including the ones you got right.

**3. Fix what broke (20 min).** Anything you got wrong or guessed, take to the
Claude Project: `teach <topic>` or `why wrong`. This is the step people skip,
and it is the one that converts a miss into knowledge.

**4. Log it.** Tick the service in the roadmap. Save the Claude session log.

**Once a week instead of the above:** a full 65-question timed mock. Not more
often — mocks measure, they don't teach, and you need new material between
measurements for the number to move.

---

## Where each tool earns its place

### The app — your gym

- **Exam Center → Smart Review** — spaced repetition. Once you have a few
  sessions logged this is the highest-value 15 minutes in the app, because it
  resurfaces exactly what you're about to forget.
- **Practice by domain** — now worth using. Domain 1 (Secure) is 30% of the
  exam and used to draw from only 46 questions; it now has 235.
- **Readiness check** — an honest percentage. Trust the trend, not any single
  number.
- **Flashcards** — for the recognition-level services, where the exam only
  asks "which service does X?"

### The Claude Project — your coaches

Paste the ten-coach instructions once, then use the commands:

- `drill me` — weighted to your weak areas
- `combo` — **use this often.** Multiple-response is where most candidates lose
  marks and where your practice was thinnest until recently
- `keywords` — rapid-fire "eleven nines → S3", "sub-millisecond → ElastiCache"
- `why wrong` — the single most useful command you have
- `compare X vs Y` — SQS vs SNS vs EventBridge, Multi-AZ vs read replica
- `mock` / `am i ready` — an honest verdict

**Always paste last session's log first.** Without it, every session restarts
from zero and the coaches cannot target your weaknesses.

### Hands-on — do it, but cheaply

Every phase in the roadmap lists hands-on exercises. Do them: reading about a
NAT Gateway is not the same as building one and seeing the bill.

Use **Build → Solution Studio** to generate the infrastructure, deploy it, and
then **tear it down the same day.** The dashboard shows a banner while anything
is live. Set a $1 billing alarm in AWS Account Manager on day one.

---

## The last two weeks

Stop learning new services. Switch entirely to:

1. **Full timed mocks every other day.** 65 questions, 130 minutes, no pauses.
   Build the stamina — 130 minutes of dense scenarios is genuinely tiring.
2. **Every miss goes to Claude.** No exceptions.
3. **Smart Review daily** — 15 minutes.
4. **`combo` drills** — multiple-response, every session.
5. **Re-read your own wrong-answer explanations.** They are written in your
   app's question bank and they are good.

**Book the exam when you are scoring 80%+ on fresh mocks**, not 72%. The pass
mark is 720/1000 and you want margin for exam-day nerves and a bad question run.

---

## The three things most likely to cost you the exam

**1. Not practising multiple-response questions.** "Choose TWO" awards no
partial credit — one of two correct scores zero. Your bank was 99.7%
single-answer until this was fixed; a 65-question mock now gives you about 16
of them. Drill `combo` in the Project as well.

**2. Reading for the service instead of the constraint.** Most questions have
two or three technically-correct options. The words that decide it are the
constraint: a cost ceiling, a latency target, an RTO, a compliance regime.
"Most cost-effective" means the cheapest option that *still meets every stated
requirement* — an option that saves money by breaking a requirement is wrong,
and that is the single most common trap.

**3. Studying Domain 3 because it's interesting.** Performance has the most
services so it feels like the biggest topic. It is 24%. **Domain 1 (Security)
is 30%** and is mostly IAM policy evaluation, encryption and access control —
less fun, more marks.

---

## Honest gaps in your own material

Know these so you compensate rather than trusting the tools blindly:

- **Domain 4 (Cost) is 14% of the pool against a 20% exam weight**, even after
  50 questions were added. Supplement with `drill d4` in the Project.
- **Domain 2 (Resilient) is 21% against 26%.** Same remedy.
- **38 questions are flagged low-confidence** on their domain tag — genuinely
  cross-domain. Don't over-read a single domain score.
- **The app's "AI" pages are not a language model.** They are rule-based and
  will not explain a novel question. That is what the Claude Project is for —
  don't waste time expecting the app's AI Assistant to tutor you.

---

## The one-line version

Follow the 8 phases in order. Slides teach, app tests, Claude fixes the misses.
One full mock a week, then every other day in the last fortnight. Drill
multiple-response deliberately. Weight your time toward Security, not
Performance. Book it at 80%.
