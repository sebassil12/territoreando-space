# Diccionario de datos

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
