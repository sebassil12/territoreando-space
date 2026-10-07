# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Copilot, Cursor, Gemini, …) working in this repository.
Humans: this is also the shortest accurate description of the system.

## Mission
Evidence-exploration dashboard for NASA Saffire-II microgravity combustion data (Space Apps 2026, *Flame in Freefall*).
It must make experimental data **understandable and traceable** — never more certain than the sources allow.

## Architecture

Data flows one way. Each layer only reads the layer to its left.

```
descompressed/ (raw, read-only, git-ignored)
   │
   ▼
pipeline/  ── offline, CLI ──►  data/processed/*.csv   (committed, reproducible)
                                data/scientific_reference_results.json (hand-transcribed, cited)
   │
   ▼
backend/   FastAPI, loads CSV/JSON into memory at startup ── /api/*
   │
   ▼
frontend/  React + TS + Vite + Tailwind v4, calls /api via Vite proxy
```

| Path | Responsibility | Notes |
|---|---|---|
| `pipeline/build_catalog.py` | inventory → sequence / frame / calibration catalogs | pure helpers (`interval_stats`, `assign_roles`, `temporal_quality`) are unit-tested |
| `pipeline/compute_metrics.py` | per-frame pixel statistics → `frame_metrics.csv` | pixels / 8-bit intensity only |
| `backend/app.py` | `create_app(processed, raw, references)` factory + routes | every JSON response = `{data, source, warnings, quality}` |
| `backend/assistant.py` | deterministic, source-grounded Q&A | no LLM; refuses physical inference |
| `frontend/src/App.tsx` | shell, tabs, overview, catalog, science, assistant, limitations | hash deep links `#Viewer/<sequence_id>` |
| `frontend/src/Viewer.tsx` | player, provenance, frame detail, metric chart (plain SVG) | chart breaks the line at temporal gaps |
| `frontend/src/api.ts` | types + fetch helpers | mirror backend shapes here |
| `tests/` | pytest: pipeline (synthetic data), API, assistant | API tests use the committed catalogs |
| `docs/` | context, data dictionary, lineage, limitations, demo, plan | update when behavior changes |

No database, no queue, no microservices. Keep it that way unless a measured need appears.

## Commands

```bash
uv sync                                              # Python deps
uv run python -m pipeline.build_catalog              # needs ./descompressed
uv run python -m pipeline.compute_metrics --step 5
uv run uvicorn backend.app:app --reload --port 8000
cd frontend && npm install && npm run dev            # http://localhost:5173

uv run pytest -q                                     # must pass
uv run ruff check pipeline backend tests             # must pass
cd frontend && npm run lint && npm run build         # must pass
```

Run all three checks before declaring a task done.

## Scientific rules (non-negotiable)
1. Do not invent aerospace facts, physical values, equations, sample or material assignments.
2. Every scientific statement in the UI or API cites a source (file + page). Published values live only in
   `data/scientific_reference_results.json` and are labeled **Published reference**.
3. Keep categories separate: observed data · derived image metric · published result · interpretation.
4. Never infer temperature, heat-release rate, fire risk, oxygen or material from pixels.
5. `S1…S9`, `F1`, `F2` are folder labels, not sample numbers. `C1`/`C2` as cameras is a *candidate interpretation*.
6. Never concatenate Raw / Mapped / ICMAD / BIT / TIFF series. Same time window ⇒ `processing_variant`.
7. Sequences with gaps > 2× median interval are `gap_detected` and unsuitable for rates.
8. `calibration_status` is never set to `validated` automatically. No mm/cm output without a documented, validated mapping.
9. Files under `descompressed/` are read-only.
10. Missing files must produce warnings, never crashes.

## Code conventions
- English for code, comments, UI copy, docs and commits.
- Python 3.11+, stdlib first; deps managed with `uv`. Ruff line length 110.
- Prefer the smallest change that works; no new dependency for what a few lines can do.
- Backend: add routes inside `create_app`; return `envelope(...)`; 404 for unknown IDs.
- Frontend: Tailwind utility classes; shared bits in `ui.tsx`; keep types in `api.ts` in sync with the backend.
- New logic ships with one focused test. Pipeline tests build synthetic inventories in `tmp_path`.
- Charts: one series, one axis, units in labels, never draw across gaps.

## Git workflow
- Branch from `development`; open PRs into `development`. `main` receives reviewed releases only.
- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`) for regular work.
- Never commit raw data (see `.gitignore`), secrets or `.env` files.
- Do not push or open PRs unless a human asks.

## Where to look first
- What a column means → `docs/data-dictionary.md`
- How a value was derived → `docs/data-lineage.md`
- What we may not claim → `docs/scientific-limitations.md`
- What is next → `docs/implementation-plan.md`
