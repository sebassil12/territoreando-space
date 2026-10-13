# Repository rules

SAFFIRE-II evidence explorer: keep data understandable, traceable and no more certain than its sources.
Flow: read-only raw files → offline pipeline → committed CSV/JSON → FastAPI → React.
Keep this architecture; no database, queue or microservices without measured need.

- Apply local AGENTS.md only for paths involved. Read relevant references on demand; do not reread unchanged context.
- Use English for code, comments, UI copy, docs and commits. Prefer small changes and existing dependencies.
  New logic needs a focused test; contract changes must keep producers, consumers, tests and docs consistent.
- Python: use `uv`, prefer stdlib; version/lint configuration lives in [pyproject.toml](pyproject.toml).
- Never invent scientific facts, values, equations or undocumented sample/material/camera mappings.
  Scientific claims in UI/API require a source file and page.
- Separate observations, image metrics, published results and interpretations. Published values belong only in
  `data/scientific_reference_results.json`, labeled **Published reference**.
- Never infer temperature, heat-release rate, oxygen, fire risk or material from pixels.
  No physical lengths without documented, validated calibration; never validate automatically.
- Keep processing variants separate; do not derive rates from sequences with temporal gaps.
- `descompressed/` is read-only. Missing files must degrade with warnings, not crashes.
- Branch from `development`; PRs target `development`; `main` receives reviewed releases only.
  Use conventional commits. Never commit raw data, secrets or `.env` files. Push/open PRs only when requested.
- Update relevant docs when behavior changes. Before completing changes, all checks must pass:
  `uv run pytest -q`; `uv run ruff check pipeline backend tests`; `cd frontend && npm run lint && npm run build`.

Before changing scientific meaning/claims, read [scientific limitations](docs/scientific-limitations.md).
Setup/run commands: [README](README.md). Architecture: [data lineage](docs/data-lineage.md#architecture).

## Findings integration and clean code

- Preserve the findings-first dashboard, cited findings/conditions, public ranking criteria, comparison limits and grounded assistant. Model APIs are a separate, unvalidated mathematical capability.
- Folder/sample/camera associations use only documented source mappings; see docs/sources.md and the DoD references. Model input provenance is assessed separately.
- Keep confidence and safety-relevance categories distinct from probability or physical risk. Interpretation cites loaded finding IDs; image evidence remains illustrative without validated measurement.
- Preserve i18n: frontend visible copy uses the existing translation dictionaries and hooks.
- Keep functions focused: at most 30 lines/statements, four parameters and three nesting levels; prefer files below 300 lines. Document narrow exceptions in code where a cohesive contract or audited decision requires them.
- Keep the remote Ruff complexity/argument/statement limits in pyproject.toml. Do not weaken them globally.
- Contract, source, tests and docs must stay consistent across both findings and scenario APIs.
