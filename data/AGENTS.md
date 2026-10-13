# Data

- `processed/*.csv` are generated artifacts: change their producer and regenerate, rather than hand-editing rows.
- `scientific_reference_results.json` is manually transcribed: preserve source/page citations,
  units, qualifications and its disclaimer. Inspect the cited source before editing;
  if unavailable, do not guess corrections.
- Start CSV inspection with [data dictionary](../docs/data-dictionary.md), headers and bounded samples
  or filtered rows. Do not dump whole catalogs into context.
- Reproduction: [data lineage](../docs/data-lineage.md). Source inventory: [sources](../docs/sources.md).
