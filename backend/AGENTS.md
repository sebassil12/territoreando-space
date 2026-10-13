# Backend

- Add routes inside `app.py:create_app(processed, raw, references)`; preserve injectable paths.
- Load processed catalogs/references at startup; do not generate derived data in requests.
- Use `envelope(...)` for data JSON: `{data, source, warnings, quality}`.
  Unknown IDs return 404; image responses remain binary.
- `assistant.py` stays deterministic and grounded in catalogs/references. Preserve
  Observation / Interpretation / Evidence / Limitations and the unavailable fallback.
- Relevant tests: [API](../tests/test_api.py) and [assistant](../tests/test_assistant.py).
