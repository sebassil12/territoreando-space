# Diccionario de datos

## S5C2 validation audit

`pipeline.validate_s5c2` produces an isolated acquisition audit, without changing the
runtime catalogs described below. Scope and reproduction:
[Sample 5/C2 audit](saffire2-validation-audit.md).

| Output | Contract |
|---|---|
| `data/processed/s5c2_validation.json` | Generated schema version 1 review summary: source URLs/versions, exact bytes, SHA-256/CRC, frame/sensor continuity, sampled electrical-event brackets, candidate time correspondence, pending calibration and blocked comparison |
| Local `derived/frames.csv` | Original `raw_id`, archive `source_file`, `source_member`, SHA-256, decoded pixel dimensions, explicit `onboard_jpeg` variant; candidate workbook elapsed seconds, nearest spreadsheet row, signed image-minus-sensor milliseconds and coverage boolean when telemetry is usable |
| Local `derived/sensors.csv` | Original cached cell text keyed by spreadsheet column letters; `source_file`, `source_sheet`, `source_row`; only rows with epoch cells, with no resampling, interpolation or formula evaluation |
| Local `derived/sensor_columns.json` | Original labels/units from rows 1/2, exported row count and excluded rows without epoch; empty units remain empty |

The local outputs live under ignored `SAFFIRE-local-validation/`. Full telemetry
and raw frames are not committed. Summary `quality=audit_not_experimental_validation`
is an offline audit label, not a new API envelope quality. Null optical ignition,
trajectory and fidelity error mean unavailable, never zero. Nearest-row timing
residuals are numerical pairing distances, not a clock uncertainty estimate.
Published references remain exclusively in `scientific_reference_results.json`.

Todos los archivos los genera `pipeline/` en `data/processed/`. Cada fila incluye `source_file`.

## sequence_catalog.csv — una fila por carpeta de imágenes
| Columna | Significado |
|---|---|
| sequence_id | `{group}-{camera}-{variant}-{format}-{partN or single}`, p. ej. `S1-C2-raw-jpeg-part1` |
| group, camera | etiquetas de carpeta del inventario; SnCm = muestra n, cámara m; F1/F2 = pre/post-flow (DoD Tabla 2) |
| file_type | etiqueta del inventario: Raw JPEG, Mapped JPEG, ICMAD PNG, Mapped TIFF, BIT |
| processing_variant | raw, mapped, icmad, bit |
| part | número de parte en el nombre de la carpeta; vacío si no hay |
| folder | nombre original de la carpeta |
| n_files | fotogramas listados en el inventario |
| first_raw_id, last_raw_id | raw_id mínimo / máximo |
| duration_s | (último − primero) / 1000 |
| median_diff_ms, min_diff_ms, max_diff_ms | estadísticas de las diferencias entre raw_id consecutivos |
| duplicates | cantidad de raw_id repetidos |
| n_gaps_gt_2x | intervalos mayores que 2 × la mediana |
| temporal_quality | continuous, gap_detected, overlapping_variant, incomplete, unknown |
| sequence_role | primary, processing_variant, bit_sequence |
| calibration_file | rejilla de distorsión del mismo group+camera, si existe |

Precedencia de `temporal_quality`: gap_detected > overlapping_variant > incomplete (archivos faltantes) > continuous.

## frame_catalog.csv — una fila por fotograma
| Columna | Significado |
|---|---|
| frame_id | `{sequence_id}-f{frame_index:05d}` |
| raw_id | id numérico en el nombre del archivo; campo principal de ordenamiento |
| frame_index | posición desde 0 tras ordenar por raw_id |
| time_s | (raw_id − primer raw_id de la secuencia) / 1000 |
| relative_path | `folder/file_name`, relativo a la carpeta de datos crudos |
| availability | available, missing (la carpeta existe, falta el archivo), path_only (no existe la carpeta) |
| warning | separado por `;`: `gap_before:<s>`, `duplicate_raw_id`, `asset_missing`, `asset_path_only` |

## calibration_catalog.csv — una fila por (rejilla, secuencia vinculada)
| Columna | Significado |
|---|---|
| calibration_id | `CAL-{group}{camera}[-{sequence_id}]` |
| reference_length_mm | tomado del nombre del archivo (`30mmBlock`); vacío si no se indica |
| calibration_status | validated, pending, unavailable — actualmente nunca validated |

## frame_metrics.csv — formato largo, una fila por (fotograma, métrica)
| Columna | Significado |
|---|---|
| metric_name | mean_intensity, bright_pixel_fraction, bright_area_pixels, centroid_x, centroid_y, bbox_width_pixels, bbox_height_pixels |
| unit | intensity_0_255, fraction, pixels, px |
| method | conversión a escala de grises + umbral fijo |
| threshold | 128 (vacío para mean_intensity) |
| confidence | high (estadística directa), medium (área dependiente del umbral), low (geometría) |
| source_file | ruta de la imagen a partir de la cual se calculó el valor |

Muestreo: uno de cada 5 fotogramas, más el primer fotograma tras cada hueco y el último. Las métricas geométricas se
omiten cuando ningún píxel alcanza el umbral.

## scientific_reference_results.json
Valores transcritos de urban2019 con números de página. Etiqueta: *Referencia publicada* (*Published reference*).

## findings.json — hallazgos transcritos a mano (`data/processed/findings.json`)
Validados al cargar por `backend/findings.py`; un hallazgo inválido se excluye con advertencia.

| Campo | Significado |
|---|---|
| finding_id | estable: `F-urban2019-NNN`, `F-dod-NNN`, `F-data-NNN` |
| title, summary, observation | texto en español, fiel a la fuente; `observation` lleva los valores citados |
| experiment, sample, material, condition | según la fuente; `sample` = "1"…"9" solo si la fuente nombra la muestra; desconocido → null |
| theme | flame_spread, flame_length_limit, test_conditions, scale_and_generalization, image_interpretation, data_provenance, data_coverage, calibration |
| metric, value, unit | `value` numérico solo con `unit` y con evidence_type `published_result` o `instrument_measurement` |
| evidence_type | published_result, instrument_measurement, image_observation, derived_metric, data_quality_note (la interpretación nunca se guarda aquí) |
| source_path, source_location, source_quote | archivo (en `descompressed/` o documentado en `docs/sources.md`), página/tabla/sección y cita textual en inglés |
| confidence + confidence_rationale | high / medium / low (criterios abajo) |
| safety_relevance + safety_relevance_rationale | high / medium / low (criterios abajo); nunca predicción de riesgo |
| limitations | lista de textos |
| related_sequences | `sequence_id` de la misma muestra según DoD Tabla 2; nunca mezcla variantes del mismo canal; vacío si no hay mapeo |
| data_status | complete, partial, conflicting, unknown |
| reference_id | id relacionado en `scientific_reference_results.json`, o null |

Criterios de **confidence** (respaldo que la fuente da a la afirmación):
- `high`: valor o afirmación explícita de la fuente, medida en vuelo o leída textualmente de un documento.
- `medium`: atribuida a modelado, valor aproximado ("about", "appears"), transcripción visual de una tabla-imagen o
  cálculo del equipo sobre archivos locales.
- `low`: fuentes en conflicto o afirmación incierta.

Criterios de **safety_relevance** (según la fuente, no predicción):
- `high`: la fuente vincula la afirmación con la seguridad contra incendios en naves (p. ej. urban2019 p.168, p.181).
- `medium`: la fuente la sitúa en condiciones representativas de una nave (flujo "typical of air circulation speeds
  in a spacecraft", p.168) o en material relevante para la tripulación (p.173), sin vínculo explícito con seguridad.
- `low`: método, procedencia o calidad de datos; sin vínculo citado con la seguridad.

**Ranking** (`GET /api/findings/ranked`, reglas en `backend/analysis.py::RANKING_RULES`): puntaje = safety_relevance
(3/2/1) + confidence (3/2/1) + evidence_type (published/instrument 2, image/derived 1, data_quality_note 0) +
data_status (complete 0, partial −1, conflicting/unknown −2). Desempate: puntaje, safety_relevance, confidence,
finding_id. Cada fila trae `score_breakdown`. Es un orden de lectura, no una probabilidad ni un riesgo.

## sample_conditions.csv — condiciones por muestra (`data/processed/sample_conditions.csv`)
| Columna | Significado |
|---|---|
| sample, folder_label, psi_record_meaning | "1"…"9", "F1", "F2"; etiqueta de carpeta; descripción del registro PSI (DoD Tabla 2) |
| material, thickness_mm, igniter_position | DoD Tabla 1 (imagen, transcripción visual) |
| airflow_cm_s_dod, airflow_cm_s_urban2019, airflow_status | flujo por fuente; `airflow_status` = consistent, conflicting, single_source |
| oxygen_pct, pressure_atm | solo donde urban2019 lo reporta por muestra (5 y 6; presión solo 5); vacío si no |
| dimensions_cm | "5 x 29" (DoD, texto; urban2019 p.173) |
| jpeg_received, jpeg_local | JPEG recibidos (xlsx `Received - jpeg`) y presentes localmente (`docs/data-audit.md`, H7) |
| local_sequences | `sequence_id` locales de la muestra (sin BIT), separados por `;` |
| source_path, source_location, confidence, notes | cita de la fila; confidence high si urban2019 confirma el material |

`GET /api/compare` usa `material`, `thickness_mm`, `airflow_cm_s` (null si las fuentes se contradicen),
`igniter_position`, `oxygen_pct` y `pressure_atm`; `comparison_status = limited` si algún factor difiere, falta o
está en conflicto.

## Model and scenario contracts

The CSV files below are generated by `pipeline/` into `data/processed/`. Every row carries `source_file`.
Published reference JSON is manually transcribed. The dimensionless model API produces in-memory
responses only; its [versioned contract](dimensionless-model.md) is separate from these evidence artifacts.
The [Scenario Engine version 1 contract](scenario-engine.md#implemented-api-contract)
also produces only in-memory JSON. Scenarios preserve original quantity/declaration
provenance; assessments add normalized values, candidate evidence, missing inputs,
per-output dispositions and revision fingerprints. They do not change CSV schemas
or add modeled values to published-reference JSON.

The React Scenario Builder mirrors these contracts in
`frontend/src/scenarioTypes.ts` and serializes only registry-declared quantities
in `frontend/src/scenario/scenarioDraft.ts`. Blank numbers remain omitted; an
explicit zero remains a provided quantity. Units are explicit and fixed by the
contract, and all editor entries retain `origin="user_assumption"`. Urban's
alternative mass representation is selected explicitly; switching it removes
the previous alternative's inputs. No constants or source values are supplied
by the editor. Revisions invalidate previous assessment/results, and the
fingerprint is sent unchanged for evaluation. The schematic is presentation,
not another scientific data product. Producer/consumer tests use frontend-built
requests with the actual backend registry; see [builder scope](scenario-engine.md#implemented-scenario-builder).

The guided setup selector adds only explicit declarations/acknowledgments from the
selected registry model; numeric fields remain blank. The 3D adapter exposes
`flow`, `gravity` (label) and `shape` category, with no model result or quantity.
Display orientation and camera settings are local presentation state, not scientific
request fields or persisted evidence. See [3D classification](digital-twin-3d.md).

## SAFFIRE playback schema v1

The scientific-reference JSON adds `playback_cases`: case ID/label, Vf/lp reference
IDs, source-review status and time-series availability. The optional
`transcribed_from` and `verification` fields preserve inherited transcription
lineage. Published numeric values remain only in the results catalog.

Playback API envelopes contain derived data, not model evaluation results.
Each evidence quantity retains source file/page, units and Published reference
classification; each trajectory declares time/position units, local origins,
formulas, duration and two **derived** anchors. Available quality is
`derived_from_published_reference`; missing evidence gives `unavailable` and no
trajectory. See [complete field contract](saffire-playback.md#api-and-failure-behavior).

Playback v1 adds an explicit `airflow_direction` to case manifests and an `airflow`
object to API cases: direction, original condition string, reference ID, file and
page. Evidence quantities retain the original `flow` string. No new measured
number or direction is inferred from images. Speed multipliers and shader art
settings are view state, not scientific inputs or evidence.

## NASA Evidence Replay metadata

`scientific_reference_results.json` now includes NASA presentation and PSI-99
Readme source records. Each playback case's `replay_audit` records review date,
exact-pair verification status, comparison source/page, cited sample geometry and
optional documented image mapping. Published dimensions remain in this reference
file, separate from generated catalogs and renderer settings.
See the [API contract](nasa-evidence-replay.md#api-and-provenance) for the additive
`/api/twin/evidence-replay` fields, null registration and unavailable fidelity error.
