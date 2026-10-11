# Auditoría de datos e inventario de `descompressed/`

## Objetivo
Inventariar archivo por archivo `descompressed/` (solo lectura) y auditar qué soporta cada familia de datos para la
misión findings-first: hallazgos, materiales, muestras, sensores, condiciones, brechas y subconjunto para el MVP.

## Hechos iniciales
- `descompressed/`: 2.1 GB, 69 404 archivos (57 968 jpeg, 9 513 png, 1 911 tif, 5 csv, 3 pdf, 2 docx, 1 xlsx, 1 txt).
- Inventarios previos: `data/processed/{sequence,frame,calibration}_catalog.csv`, `frame_metrics.csv` (pipeline existente).

## Alcance
- Script de solo lectura `pipeline/build_inventory.py` → `docs/data-inventory.csv` (una fila por archivo de `descompressed/`).
- `docs/data-audit.md` con las secciones pedidas.
- Pruebas focalizadas en `tests/test_inventory.py`.
- Sin cambios de misión, sin dashboard, sin nuevas dependencias.

## Tareas
- [x] T1 — Reconocimiento + script de inventario + pruebas + `docs/data-inventory.csv` (ruta: delegada)
- [x] T2 — `docs/data-audit.md` (ruta: delegada, mismo writer)

## Checks
`uv run pytest -q` · `uv run ruff check pipeline backend tests` · verificación de inmutabilidad (mtime/hash de muestra antes y después).

## Progreso
- Rama `feat/data-audit-inventory`.
- T1: `pipeline/build_inventory.py` (reutiliza `sequence_id`, `interval_stats`, `assign_roles`, `temporal_quality`,
  `grid_reference_mm` de `build_catalog`); `docs/data-inventory.csv` = 69 404 filas = 69 404 archivos en disco,
  0 ilegibles, 0 faltantes, 0 duplicados sha256; 28,9 MB (> 20 MB, sin comprimir ni cambiar formato); ≈11–20 s.
  `tests/test_inventory.py`: 8 pruebas (enumeración, firma, cabecera, xlsx/txt, etiquetas documentadas, valores
  vacíos/unknown, inmutabilidad, faltantes/duplicados).
- T2: `docs/data-audit.md` con las 8 secciones; línea + comando en `docs/data-lineage.md` y `README.md`.
- Evidencia de checks: `uv run pytest -q` → 39 passed; `uv run ruff check pipeline backend tests` → All checks
  passed; inmutabilidad: 20 archivos (12 documentos + 8 imágenes) con tamaño, mtime y sha256 sin cambios.
- Excepción §4: `pipeline/build_inventory.py` tiene 343 líneas (> 300), justificada en su docstring.
- Hallazgo clave: `SAFFIRE-II DoD.docx` mapea S1…S9 → muestras/materiales y C1/C2 → cámaras; contradice AGENTS.md
  regla 5 y `docs/scientific-limitations.md` (decisión pendiente del usuario). Conflicto de flujo S6: 25 cm/s
  (urban2019 p.173) vs. 30 cm/s (DoD Tabla 1).
- Sin commits (la tarea prohíbe operaciones git).

## Próximo paso
Decidir si se actualizan AGENTS.md regla 5, `docs/scientific-limitations.md` y `docs/sources.md` con DoD,
Nomenclature PDF y el manifiesto xlsx; luego P0-2 (transcribir hallazgos de S5/S9 con cita).
