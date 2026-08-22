# SAA-C03 question-source library

This directory separates private calibration material from the public application question bank.

## Layout

- `raw/` — original user-supplied files. PDFs are intentionally gitignored and must never be bundled or published.
- `audit.json` — inventory and comparison results.
- Curated imports belong under `src/data/` only after validation and deduplication.

## Import policy

Raw recalled/live certification wording is reference material only. Do not copy it verbatim into the application. Extract the architecture concept, constraints, services, distractor pattern, and difficulty, then author an original scenario with complete option explanations and metadata.

Before merging a derived batch, validate unique IDs, answer indexes, multiple-response selection counts, domain distribution, explanations for every distractor, and overlap with the existing bank.

## Current decision

Keep the validated 794-question bank as the application source of truth. The private PDF contains 1,019 numbered items, but the count difference does not establish 225 unique coverage gaps. Automated prompt triage found duplicate signals inside the private source and no exact copies of existing app prompts. Because differently worded questions can still test the same objective, additions require human concept-level review and must be newly authored.

The aggregate comparison is stored in `audit.json`. Prompt text, answer text, and private review queues must remain local and must not be committed, synced, or displayed in the app.
