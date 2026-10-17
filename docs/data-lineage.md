# Linaje de datos

```
descompressed/saffire_inventory.csv ──► pipeline/build_catalog.py ──► data/processed/sequence_catalog.csv
                                    │                              ├─► data/processed/frame_catalog.csv
descompressed/<folders>/ (exists?) ─┘                              └─► data/processed/calibration_catalog.csv
descompressed/continuidad_series.csv ──► cross_check() (printed, never written)

data/processed/frame_catalog.csv + images ──► pipeline/compute_metrics.py ──► data/processed/frame_metrics.csv

descompressed/urban2019.pdf ──(manual transcription, page cited)──► data/scientific_reference_results.json

descompressed/urban2019.pdf ─┐
descompressed/SAFFIRE-II DoD.docx ─┼─(manual transcription, file + location cited)──► data/processed/findings.json
descompressed/*.xlsx, continuidad_saltos.csv ─┘                                      └─► data/processed/sample_conditions.csv

data/processed/findings.json + sample_conditions.csv + sequence_catalog.csv
   ──► backend/findings.py (validation at load; invalid findings excluded with a warning)
   ──► backend/analysis.py (rule-based ranking, side-by-side comparison)
   ──► backend/routes/findings.py (/api/findings*, /api/conditions, /api/compare)

data/processed/* + references JSON + findings ──► backend/app.py (FastAPI) ──► frontend (React)
                                              └─► backend/assistant.py (deterministic answers citing finding IDs)
```

## Capa de hallazgos
- `findings.json` se transcribe a mano; cada hallazgo lleva `source_path` y `source_location` (página, sección o
  tabla). Ningún hallazgo se calcula desde píxeles ni se genera con un LLM.
- `sample_conditions.csv` transcribe DoD Tabla 1 (imagen embebida; confianza media) y Tabla 2, contrastadas con
  urban2019 p.173, p.177 y p.181. Las condiciones no reportadas quedan vacías. Si dos fuentes discrepan (flujo de S6),
  se guardan ambas columnas (`airflow_cm_s_dod`, `airflow_cm_s_urban2019`) y `airflow_status = conflicting`.
- `related_sequences` enlaza un hallazgo con secuencias del catálogo por la etiqueta compartida (DoD Tabla 2,
  `F-dod-001`); las imágenes son contexto ilustrativo, no la medición del hallazgo.
- El puntaje del ranking se deriva solo de las categorías del hallazgo (`backend/analysis.py::RANKING_RULES`) y se
  expone con su desglose; no es una probabilidad ni un riesgo.
- Validación: `backend/findings.py` al cargar y `tests/test_findings.py` en CI local (`uv run pytest -q`).

## Reglas de derivación
- Los fotogramas se ordenan por `raw_id` (entero en el nombre del archivo).
- `raw_id` se trata como una marca de tiempo en milisegundos. Justificación: las diferencias consecutivas son de ~33 ms,
  coherentes con las cámaras de 30 fps descritas en urban2019 p.173. Es una inferencia; ningún archivo de metadatos lo
  documenta.
- `time_s` es relativo al primer fotograma de cada secuencia y nunca se comparte entre secuencias.
- Hueco: intervalo > 2 × el intervalo mediano de la secuencia (misma regla que `continuidad_series.csv`).
- Variante: mismo group+camera con rango de raw_id superpuesto. Preferencia para la primaria: Raw JPEG > Mapped JPEG >
  ICMAD PNG > Mapped TIFF. Las variantes son secuencias separadas; los fotogramas nunca se combinan.
- Las partes consecutivas (p. ej. S1-C2 raw part1 y luego mapped part2, separadas por 34 ms) son ambas primarias pero
  son variantes de procesamiento distintas; no se concatenan.
- Los archivos fuente se abren en solo lectura.

## Reproducir
```
uv run python -m pipeline.build_catalog --raw descompressed
uv run python -m pipeline.compute_metrics --raw descompressed --step 5
uv run python -m pipeline.build_inventory   # solo lectura de descompressed/ → docs/data-inventory.csv
```

Inventario archivo por archivo de `descompressed/` (tipo por firma, cabeceras de imagen, documentos, roles y
muestra/material solo con cita documental): `docs/data-inventory.csv`, generado por `pipeline/build_inventory.py`;
leyenda y auditoría en `docs/data-audit.md`.

## Architecture

Derived data flows from the offline pipeline to committed CSV/JSON, then through FastAPI to React.
The backend also opens original images read-only to serve frames; TIFF conversion happens in memory.
Catalog and reference data are loaded into memory at app startup. The frontend consumes `/api` via the Vite proxy.

The separate dimensionless model API accepts explicit user assumptions and evaluates a pure steady 0D
equation in memory. This request-time calculation does not regenerate evidence catalogs or metrics,
write outputs, or introduce a database, queue or service. A separate React Scenario
Builder consumes this API and displays an interactive schematic 3D without changing evidence artifacts.

| Path | Responsibility |
|---|---|
| `descompressed/` | Original inventories, images and publications; read-only and git-ignored |
| `pipeline/build_catalog.py` | Inventory → sequence, frame and calibration catalogs; continuity cross-check |
| `pipeline/compute_metrics.py` | Frames and images → sampled pixel statistics |
| `data/processed/*.csv` | Committed, reproducible catalogs and image metrics |
| `data/scientific_reference_results.json` | Hand-transcribed published values and facts with citations |
| `backend/app.py` | App factory, catalog loading, `/api` routes and original-image serving |
| `backend/assistant.py` | Deterministic answers from catalogs and published references |
| `backend/physics.py` | Pure dimensionless thin-fuel plus-root evaluation; no I/O |
| `backend/simulation_contracts.py` | Versioned twin contracts and equation/source metadata |
| `frontend/src/App.tsx` | Shell, navigation, overview, catalog, science, assistant, limitations and Digital Twin |
| `frontend/src/Viewer.tsx` | Playback, provenance, frame detail and SVG metric chart |
| `frontend/src/api.ts` | API types and fetch helpers |
| `tests/` | Synthetic pipeline/model tests, evidence API/assistant tests, and asset-independent twin API tests |
| `docs/` | Scope, sources, schemas, derivations, limitations, demo and implementation status |


## Model evaluation flow

Model results use `quality="modelled_unvalidated"`, carry the original dimensionless inputs and model
version, and are never stored among observations, image metrics or published reference results.
The model's source PDF is cited by URL/file/page; a local copy is not required for runtime evaluation.
Contract, equation, hypotheses and mathematical states: [dimensionless model API](dimensionless-model.md).

### Implemented scenario routing

The [Scenario Engine](scenario-engine.md) is implemented:
versioned scenario → units/provenance checks → model requirements and applicability
assessment → eligible existing evaluator → result with evidence and visual capabilities.
It remains within this FastAPI application and does not change the offline evidence
pipeline. Registry, contracts, assessment and dimensionless routing are implemented;
guided frontend controls and schematic 3D are implemented. Dynamic physical
visual adapters remain pending. Evaluation routes only to
the existing dimensionless model; 2016 and Urban return blocker reports and no
numerical results.

| File | Responsibility |
|---|---|
| backend/scenario_contracts.py | Strict version 1 scenario, quantity/declaration provenance and registry/assessment/evaluation contracts |
| backend/scenario_registry.py | Three-model requirements, source citations and server-owned evidence status; no physical presets |
| backend/scenario_engine.py | Pure unit normalization, applicability/requirements/provenance decisions, fingerprints and dimensionless adapter |
| tests/test_scenario_engine.py | Selection/refusal, source scope, unreviewed provenance, unavailable models, stale revisions and API compatibility |
| frontend/src/scenarioTypes.ts | TypeScript version 1 scenario/registry/assessment/evaluation contracts |
| frontend/src/scenario/scenarioDraft.ts | Registry-only fields, explicit user assumptions, missing-input preservation and output readiness |
| frontend/src/scenario/useScenarioBuilder.ts and requestGate.ts | Revision invalidation, abort/late-response protection and assessment-before-evaluation |
| frontend/src/screens/ScenarioBuilder.tsx and frontend/src/scenario/ | Guided model choice, selected inputs, simple results, Advanced conditions and Scientific details |
| frontend/src/scenario/guidedScenario.ts | Explicit setup acceptance with user-assumption provenance; scene adapter limited to direction, gravity label and shape |
| frontend/src/scenario/ScenarioScene.tsx and scene/ | Lazy-loaded Three.js illustration, camera/display controls and GPU resource cleanup; no numeric physics dependencies |
| frontend/tests/scenario.test.mjs | Focused UI logic, rendering and structured API-error tests using existing TypeScript tooling |
| tests/test_scenario_ui_contract.py | Actual frontend-generated requests checked against the real registry and FastAPI |

Requests follow: scenario → normalized units and retained original provenance →
registry assessment → exact permitted output → reassessment/fingerprint check →
existing physics evaluator → in-memory result. No sources are fetched, no formula
from request text is executed, and no evidence files are written. Assessment and
registry responses have quality unavailable because they contain no numerical
model result; successful evaluation has quality modelled_unvalidated.

React follows registry → explicit setup selection → blank numeric inputs → current
assessment → fingerprint → eligible evaluation. Selecting the labelled setup records
only its declared conditions and acknowledgments; it supplies no numeric values.
Inputs remain user assumptions, not observations or published references. Every
scenario edit clears assessment/results; stale responses cannot restore them.
The mathematical scene adapter receives only flow direction, gravity label and shape category.
Numeric model outputs stay in the result panel and never enter flame geometry or
color. Camera and sample-display orientation affect presentation only. See the
[3D data classification](digital-twin-3d.md#what-drives-the-3d).

**IMPLEMENTED:** backend decisions, adapter and React Scenario Builder. **BLOCKED:** research-model and
documented-experiment evaluation. **PENDING:** reviewed parameter/derivation records,
dynamic visual twin. **VALIDATED:** no project experimental model validation.

## Published-reference playback lineage

`data/scientific_reference_results.json` → `backend/playback.py` (startup-only
reference validation and derived anchors) → `/api/twin/playback-cases` →
`SaffirePlayback` → `usePlayback` / `kinematics` → `playbackObjects` → Three.js.
The case manifest references published values by ID. It copies no constants into
the frontend and does not read image sequences. SAFFIRE-3 lp is structured from
its existing spread-rate notes with explicit transcription lineage.

Published inputs, derived anchors and visual proxies carry distinct labels.
The shared renderer isolates its playback adapter from mathematical scene inputs;
no model registry gate changes. Case/mode changes dispose old playback state.
See [source review, formulas, units and failure behavior](saffire-playback.md).

The playback renderer now consumes frame time and longitudinal bounds as shader
uniforms. Explicit case airflow direction feeds both the arrow and noise-advection
sign; original flow condition text/file/page is passed through the API without
parsing a new numeric parameter. Art coefficients stay in `playback/fire/shaders.ts`
and never enter scientific results. Render targets contain temporary view pixels,
not evidence artifacts. [Renderer lifecycle](digital-twin-3d.md#procedural-combustion-renderer-implemented).

## Evidence Replay composition

The [replay catalog](nasa-evidence-replay.md#api-and-provenance) is assembled once
at API startup from the existing processed catalogs and the manually reviewed
reference JSON. A read-only filesystem presence check supplements historical
catalog availability. Existing frame endpoints provide images and stored pixel
statistics; no scientific processing runs in a request. The UI keeps the image
index independent of the schematic renderer and preserves processing variants.


### External validation-audit evidence

The [Sample 5 audit](saffire2-validation-audit.md#verified-sample-frame-and-time-chain)
checks original JPEG identifiers against the mapped part-1 catalog and locates the
first-image epoch in NASA's sensor workbook. ZIP directories and bounded XML/image
ranges were inspected in temporary storage only. No catalogs were regenerated and
no timestamp transform was added to the API; filename-relative runtime time remains
unchanged. Native sensor RAW, onboard JPEG and mapped products remain distinct.
