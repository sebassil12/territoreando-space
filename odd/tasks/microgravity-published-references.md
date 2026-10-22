# Microgravity flame-spread published references

## Objective
Add newly verified microgravity flame-spread published references and cited findings so the dashboard can use
them, without changing existing consumers or scientific claims.

## Problem
`data/scientific_reference_results.json` only carries Urban 2019 values. NASA NTRS sources (Ferkul 2017 LSFT,
BASS-II 2014, Olson 2015, Urban ICES-2021, FLARE 2021, Urban ICES-2025, OCHMO-TB-008) add flight results
(Saffire I/II/IV/V, BASS-II) and operational context that are not yet traceable in the repository.

## Scope
- Additive, backward-compatible optional result fields: `flow_direction`, `gravity`, `thickness`,
  `value_qualifier`, `value_range`, `uncertainty`, `locator`. Integer `page` is kept.
- Seven new `sources` entries with full citation and URL.
- Verified results and facts transcribed only from extracted PDF text (PDF page numbers).
- Cited findings in `data/processed/findings.json` where the schema supports external sources.
- Docs: `docs/sources.md`, `docs/data-dictionary.md`.

## Constraints
- Never invent values. Each value re-read in the source text before writing; `report.md` (AI-generated) unused.
- Known conflicts stay as separate records: S5 2.03 mm/s (urban2019) vs 2.1 mm/s (Ferkul 2017);
  Saffire-II O2 21% (ICES-2021 Table 2) vs 22.1% (urban2019, Ferkul 2017 Table I "~22.1").
- No UI changes. No probability or physical-risk claims. Playback/replay consumers must keep passing.

## Tasks
- [x] T0 — Feature document (route: delegated writer)
- [x] T1 — Schema: optional fields + seven sources (route: delegated writer, same writer as T2)
- [x] T2 — Verified results and facts, test-first (route: delegated writer)
- [x] T3 — Cited findings for external NTRS sources (route: delegated writer)
- [x] T4 — Docs: sources and data dictionary (route: delegated writer)

Route evidence: orchestrator delegated one bounded writer (2+ non-trivial files: reference JSON, findings JSON,
validator, tests, docs).

## Acceptance
- Every result/fact `source` key exists in `sources`; every page is a positive integer.
- Optional fields only take documented values; no-spread / not-ignited records keep `value: null`.
- Existing playback and evidence-replay outputs are unchanged.
- New findings load without exclusion warnings.

## Checks
`uv run pytest -q` · `uv run ruff check pipeline backend tests` ·
`cd frontend && npm run lint && npm run build && npm test`

## Progress
- Branch `feat/microgravity-published-references`.
- T1/T2: `tests/test_reference_results.py` written first. RED: 3 failed, 2 passed (missing sources/IDs).
  GREEN after data: 5 passed; full `uv run pytest -q`: 223 passed. 26 results + 8 facts + 7 sources added.
  Correction to the brief: in Ferkul 2017 Table I, "Acceleratory" is the 1-g spread-rate column, not a
  property of the microgravity S6 value (2.6 mm/s). The S7 PMMA flame power text extracts as "460 + 50 W";
  no uncertainty is stored because the symbol is unconfirmed. Playback/replay consumers needed no change
  (they select by ID; `value: null` was already supported by `saffire2-s6-flow`).
- T1/T2 commit: f037f48.
- T3: RED `test_external_ntrs_findings_load_with_published_reference_links` (1 failed) → GREEN. Seven findings
  (F-ferkul2017-001..004, F-bass2-001, F-urban2021-001..002) in English, verbatim source quotes, NTRS URL as
  `source_path`; three NTRS URLs added to `DOCUMENTED_SOURCES` in `backend/findings.py`. `uv run pytest -q`:
  224 passed; ruff clean. F-ferkul2017-004 uses theme `flame_spread` (not `flame_length_limit`) because the
  latter made it a top-3 keyword hit for "PMMA limiting length", breaking the urban2019-only assistant test.
  Ranking now opens with F-bass2-001 and F-ferkul2017-003 (high/high published results, per public rules).
- T3 commit: 63caaed.
- T4: `docs/sources.md` (new "Microgravity published references" section with open conflicts) and
  `docs/data-dictionary.md` (optional result fields, finding ID patterns, language and URL `source_path`).
  Passive docs: structural readback only, no RED applicable.
- Final checks: `uv run pytest -q` 224 passed; `uv run ruff check pipeline backend tests` all passed;
  `npm run lint` exit 0, no findings; `npm run build` ok (pre-existing chunk-size warning); `npm test` 16/16.
- Next step: orchestrator decides RDD assessment, push and PR (target `development`).
