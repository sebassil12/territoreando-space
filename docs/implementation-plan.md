# Implementation plan & status

| Phase | Deliverable | Status |
|---|---|---|
| 0 Context | docs/project-context.md, sources.md | done |
| 1 Normalize | sequence / frame / calibration catalogs, cross-checked with continuidad_series.csv | done |
| 2 Backend | FastAPI, envelope `{data, source, warnings, quality}` | done |
| 3 Dashboard | React + Vite + Tailwind: overview, catalog, viewer, frame detail, analysis, science, limitations | done |
| 4 Image metrics | frame_metrics.csv (pixels / intensity only) | done |
| 5 Calibration | grid detection, status `pending`; no conversion | partial (by design) |
| 6 Published references | scientific_reference_results.json with page numbers | done |
| 7 Assistant | deterministic, source-grounded; Observation / Interpretation / Evidence / Limitations | done |
| 8 Tests | pytest: pipeline, API, assistant | done |
| 9 Demo & docs | README, demo-script, limitations, lineage | done |

## Next tasks (in order)
1. Validate pixel→mm for one sequence using its 30 mm grid (measure block size, check distortion, document,
   then flip `calibration_status` to `validated` only for that sequence).
2. LED-frame detection (periodic green illumination) to separate lit and dark frames before plotting metrics.
3. Mask the burned-in TIFF banner before computing metrics.
4. Optional LLM layer on top of the deterministic assistant, restricted to the same evidence and output format.
5. Plug in the official challenge deliverable list once published (28 Oct 2026).
