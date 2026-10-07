# Data lineage

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

## Derivation rules
- Frames sorted by `raw_id` (integer in the file name).
- `raw_id` is treated as a millisecond timestamp. Justification: consecutive differences are ~33 ms, consistent with the
  30 fps cameras described in urban2019 p.173. This is an inference; no metadata file documents it.
- `time_s` is relative to the first frame of each sequence, never shared across sequences.
- Gap: interval > 2 × median interval of the sequence (same rule as `continuidad_series.csv`).
- Variant: same group+camera with overlapping raw_id range. Primary preference: Raw JPEG > Mapped JPEG > ICMAD PNG >
  Mapped TIFF. Variants are separate sequences; frames are never merged.
- Consecutive parts (e.g. S1-C2 raw part1 then mapped part2, 34 ms apart) are both primary but are different
  processing variants; they are not concatenated.
- Source files are opened read-only.

## Reproduce
```
uv run python -m pipeline.build_catalog --raw descompressed
uv run python -m pipeline.compute_metrics --raw descompressed --step 5
```
