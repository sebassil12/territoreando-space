# Tests

- Pipeline tests use synthetic inventories/images in `tmp_path`; write outputs there.
- API/assistant integration tests use committed catalogs via `create_app(...)`; do not regenerate data to run them.
- Simulate missing assets/catalogs/references with injected temporary paths.
- Test observable contracts, provenance, warnings and scientific refusals.
- Raw TIFF serving is conditional on local images; distinguish skipped tests from passed tests.
- Map: `test_pipeline.py` → derivations; `test_api.py` → routes;
  `test_assistant.py` → grounded answers and refusals.
