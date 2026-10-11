# Documentación en español + i18n del frontend

## Objetivo
El equipo trabaja en español: documentación, comentarios y docstrings pasan a español.
El frontend obtiene un locale con traducciones `es` / `en`; idioma por defecto `es`.

## Alcance
- `README.md`, `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `docs/*.md` → español.
- Comentarios y docstrings en `pipeline/`, `backend/`, `tests/`, `frontend/src/` → español.
- Frontend: `frontend/src/i18n.tsx` (diccionarios `es`/`en`, contexto, `useT`, selector de idioma, persistencia en `localStorage`), todo el texto de UI vía `t(...)`.

## Fuera de alcance
- Identificadores de código, nombres de rutas, columnas CSV, claves JSON.
- Cadenas devueltas por la API (`warnings`, respuestas del asistente): siguen en inglés; los tests las verifican.

## Restricciones
- Sin nuevas dependencias (i18n propio en pocas líneas).
- Reglas científicas de `AGENTS.md` se conservan íntegras, solo se traducen.

## Tareas
- [x] T1 — Traducir documentación y comentarios a español (ruta: delegada, >2 archivos no triviales)
- [x] T2 — Locale `es`/`en` en frontend, `es` por defecto (ruta: delegada, misma escritura)

## Checks
`uv run pytest -q` · `uv run ruff check pipeline backend tests` · `cd frontend && npm run lint && npm run build`

## Progreso
- Rama `feat/spanish-docs-i18n` creada desde `development`.
- T1 + T2 implementadas (escritor delegado). Checks observados:
  - `uv run pytest -q`: 31 passed, 1 warning (deprecación de httpx en starlette, preexistente).
  - `uv run ruff check pipeline backend tests`: sin hallazgos.
  - `npm run lint`: 0 advertencias (exit 0). `npm run build`: OK (tsc + vite).
  - Revisión puntual: sin literales de UI en inglés en JSX; solo quedan claves internas de pestaña (hash) y el nombre del producto.
  - Las 5 sugerencias del asistente en español se enrutan correctamente en el backend (4 grounded, temperatura → not_available).
- Pendiente: commit de la unidad de trabajo (lo decide el orquestador).
