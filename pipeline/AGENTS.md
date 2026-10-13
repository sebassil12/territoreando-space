# Pipeline

- `build_catalog.py` generates sequence/frame/calibration catalogs;
  `compute_metrics.py` generates `frame_metrics.csv`.
- Preserve stable IDs, `raw_id` ordering, sequence-relative time and `source_file` provenance.
- A gap exceeds 2× the median positive frame interval; preserve `gap_detected` and frame warnings.
  Overlapping acquisition windows are `processing_variant` sequences.
- Preserve metric sampling: every Nth frame, first after each gap, and last frame.
- Image metrics use pixels, fractions or 8-bit intensity.
- Run CLI commands from the repository root. Confirm required inputs exist before regenerating
  committed outputs; never overwrite them from an incomplete checkout.
- Derivation/reproduction: [data lineage](../docs/data-lineage.md).
  Before changing schemas, read [data dictionary](../docs/data-dictionary.md).
- Relevant tests: [pipeline](../tests/test_pipeline.py).
