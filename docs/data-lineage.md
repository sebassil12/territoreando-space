# Linaje de datos

```
descompressed/saffire_inventory.csv ──► pipeline/build_catalog.py ──► data/processed/sequence_catalog.csv
                                    │                              ├─► data/processed/frame_catalog.csv
descompressed/<folders>/ (exists?) ─┘                              └─► data/processed/calibration_catalog.csv
descompressed/continuidad_series.csv ──► cross_check() (printed, never written)

data/processed/frame_catalog.csv + images ──► pipeline/compute_metrics.py ──► data/processed/frame_metrics.csv

descompressed/urban2019.pdf ──(manual transcription, page cited)──► data/scientific_reference_results.json

data/processed/* + references JSON ──► backend/app.py (FastAPI) ──► frontend (React)
                                    └─► backend/assistant.py (deterministic answers)
```

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
```
