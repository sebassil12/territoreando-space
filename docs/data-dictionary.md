# Diccionario de datos

Todos los archivos los genera `pipeline/` en `data/processed/`. Cada fila incluye `source_file`.

## sequence_catalog.csv — una fila por carpeta de imágenes
| Columna | Significado |
|---|---|
| sequence_id | `{group}-{camera}-{variant}-{format}-{partN or single}`, p. ej. `S1-C2-raw-jpeg-part1` |
| group, camera | etiquetas de carpeta del inventario (significado **no documentado**) |
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
