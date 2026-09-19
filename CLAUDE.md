# AWS Career Launchpad Pro — working conventions

The house style for this repo. It exists because the codebase had grown two
of several things — two visual dialects, three `StatCard`s, five
`EmptyState`s — and picking the wrong one was a coin flip. One name for one
shape, one token for one colour.

**Read this before adding a page, a component, or anything that touches AWS.**

---

## 1. Architecture invariants

These are load-bearing. Changing one is a deliberate decision, not a detail.

- **Browser-only.** No backend. Vite + React SPA on Vercel. The only
  serverless functions are `api/github/*` for the GitHub OAuth device flow,
  which cannot run client-side.
- **All user data lives in the user's browser.** `localStorage`, via
  `useLocalStorage`. Nothing is uploaded anywhere.
- **AWS SDK v3 runs in the browser**, with credentials decrypted from the
  vault in memory only.
- **Zero running cost is a product feature.** If a change adds a metered
  AWS or third-party service, that is a decision to raise, not to make.

### localStorage discipline

Quota is ~5MB **shared across the whole app**, and `useLocalStorage`
swallows `QuotaExceededError` silently — a write that fails does so with no
error. So oversized writes do not degrade, they silently stop persisting
and take unrelated features down with them.

Never persist a bulk payload: API result sets, file contents, generated
documents. Persist the summary and keep the payload in memory.

---

## 2. The AWS safety model — do not route around it

Every AWS call goes through `DeployContext`. Never construct an SDK client
in a component.

| Tier | Needs | Use for |
|---|---|---|
| 🟢 READ | Vault unlock | No side effects, no charges |
| 🟡 BUILD | Password each time | Creates a resource |
| 🟠 DESTROY | Password + type resource name | Deletes a resource |
| 🔴 ADMIN | Password + "I UNDERSTAND" + cooldown | IAM, billing, account-wide |
| ⛔ BLOCKED | — | Never executed. Hardcoded fuse. |

Adding an AWS action:

1. Register it in `src/data/awsActions.js` with an honest `cost`.
2. Implement the executor in `src/lib/awsDeploy.js`, same action id.
3. Return `{ ok, result, raw, log }` — and mind which is which:
   - **`result`** is written to the audit log. Summary only.
   - **`raw`** is never audited. Bulk payloads go here.
   - `ok: true` is the only thing that counts as success
     (`assertVerifiedResult` fails closed on anything else).

### Honesty rules

These are enforced by tests (`freeTierCostTruth`, `deploySafety`,
`claimSafety`) and they exist because a confident wrong answer is worse
than no answer:

- **Never claim a guaranteed zero bill.** "Estimated", with the free-tier
  conditions stated.
- **Distinguish "no" from "could not tell."** A missing field means
  unknown, never a clean pass. See `evaluateFindings` in
  `resourceSearch.js` for the pattern.
- **Never let an empty result read as a fact** when a prerequisite could
  explain it. An AWS Config query with the recorder off returns zero rows
  and looks identical to an empty account — so check the recorder first.
- **Surface the real AWS error verbatim.** It is the useful part.
- **Never silently truncate.** If a result set is paginated, say so.

---

## 3. Design tokens

Use the token, not the raw value. The print stylesheet (`index.css`, the
`@media print` block) pins the tokens to readable colours; raw values have
no print rule and **export as faint, washed-out text in PDFs**.

| Use | Not |
|---|---|
| `text-muted` | `opacity-70` / `opacity-60` on text |
| `surface` | `border border-token bg-[var(--card)]` |
| `border-token` | `border-slate-700` |
| `text-danger` / `text-success` / `text-warning` | `text-rose-400` / `text-green-400` |

`opacity-*` is still correct for things that are **not text**: decorative
icons, `hover:` and `group-hover:` transitions, `disabled:` states,
animation from `opacity-0`.

---

## 4. Shared components — use them, do not fork them

Before writing a local `function Card(...)`, check `src/components/common/`
and `src/components/ui/`. If something close exists, extend it with a prop.
If it is genuinely a different shape, **give it a different name** — that
is how three different `StatCard`s happened.

| Component | Use for |
|---|---|
| `PageHeader` | Every page's title block |
| `EmptyState` | "Nothing here yet". `tone="brand"` to invite action, `tone="quiet"` for a secondary panel |
| `StatCard` | Large dashboard tile — gradient wash, delta, optional sparkline. 3–4 hero figures |
| `StatChip` | Compact counter. A row of six |
| `Button` | Every button. Variants: primary, ghost, glass, danger, outline |
| `Modal` | Every dialog |
| `Skeleton` | Loading states |

---

## 5. Pages

- Route in `src/App.jsx` via `lazyWithRecovery`, never bare `React.lazy`
  (it handles stale-chunk recovery after a deploy).
- Add to `src/lib/navSections.js` under one of the five sections
  (Home / Learn / Exam / Build / Earn).
- Page components are default exports; shared components are named exports.

---

## 6. Business logic goes in `src/lib/`, not in the component

A page should render; the thinking happens in a pure module. This is what
makes it testable without a browser, credentials, or a network — and every
rule in §2 is only enforceable because it lives somewhere testable.

`resourceSearch.js` + `resourceSearch.test.js` is the reference pair.

---

## 7. Tests

Plain Node, no framework. Add a suite:

1. `src/lib/__tests__/<name>.test.js`, exporting
   `run<Name>Tests() → { allPassed, results }`.
2. Register it in `scripts/runAgentTests.mjs` — import, run, print, add its
   `allPassed` to `allOk`.
3. `npm test` must stay green.

Test the honesty rules, not just the happy path: that a missing field reads
as unknown, that a guard fails closed, that a truncated result says so.

---

## 8. Before you finish

```bash
npm test          # all suites must pass
npm run build     # must compile clean
```
