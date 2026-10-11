# MVP findings-first del dashboard

## Objetivo
Dashboard donde el hallazgo citado es la unidad primaria: resumen de seguridad, explorador de hallazgos,
priorización explicable, comparación de condiciones, evidencia visual de apoyo y asistente con fuentes.

## Fuentes de verdad
`AGENTS.md`, `docs/data-audit.md`, `docs/data-inventory.csv` (sin versionar, 28,9 MB), `docs/data-lineage.md`,
`docs/scientific-limitations.md`, `docs/sources.md`, `data/processed/`, documentos de `descompressed/`.

## Decisiones tomadas (reversibles, documentadas)
- Regla 5 de `AGENTS.md`: se actualiza para citar `descompressed/SAFFIRE-II DoD.docx` Tabla 2 (S1…S9 → muestra,
  C1/C2 → cámara, F1/F2 → pre/post-flujo). Material por muestra (Tabla 1, imagen embebida) con confianza media.
- Discrepancia de flujo S6 (urban2019 p.173: 25 cm/s vs. DoD Tabla 1: 30 cm/s) visible, sin resolver.
- Hallazgos transcritos a mano en `data/processed/findings.json` y `data/processed/sample_conditions.csv` con cita;
  validados por pruebas. Sin LLM: asistente determinista extendido (sin integración de IA previa).
- Ranking por reglas con desglose; nunca probabilidad ni riesgo.
- `docs/data-inventory.csv` se mantiene sin versionar hasta decisión del usuario; el runtime no depende de él.

## Tareas
- [x] T1 — Capa de hallazgos: corrección de reglas/fuentes, `findings.json`, `sample_conditions.csv`, validación
  (ruta: delegada; writer A)
- [x] T2 — API: `/api/findings`, ranking con desglose, `/api/compare`, asistente sobre hallazgos (ruta: delegada; writer A)
- [ ] T3 — Verificación independiente de citas de hallazgos contra los PDFs/DoD (ruta: delegada; verificador)
- [x] T4 — Frontend: resumen de seguridad, explorador, priorizados, comparación, evidencia, asistente; i18n es/en
  (ruta: delegada; writer B)
- [x] T5 — Documentación: README, demo, lineage, limitaciones (ruta: delegada; writer B)

## Checks
`uv run pytest -q` · `uv run ruff check pipeline backend tests` · `cd frontend && npm run lint && npm run build`

## Entrega
Pronóstico > 400 líneas; estrategia `ask-on-risk`: commits por unidad de trabajo en `feat/findings-mvp`; el corte en
PRs encadenados se decide al abrir PR.

## Progreso
- Rama `feat/findings-mvp` desde `feat/data-audit-inventory`.
- T1/T2 (writer A, ruta delegada): 24 hallazgos en `data/processed/findings.json` (16 urban2019, 2 DoD, 6 de
  calidad de datos), 11 filas en `sample_conditions.csv`; validador `backend/findings.py`; ranking y comparación en
  `backend/analysis.py`; rutas en `backend/routes/findings.py`; asistente extendido (status answered/refused/
  not_available, filtro P1-3 ajustado). Checks observados: `uv run pytest -q` 58 passed; `uv run ruff check pipeline
  backend tests` sin errores; import de `create_app` ok. Pruebas escritas junto con el código (sin RED previo
  observado: la mayor parte del trabajo es transcripción de datos).
- Decisiones: citas verificadas contra los archivos; la longitud límite de S9 y la duración de 900 s están en
  urban2019 **p.181** (§5.3), no p.180 como dice `scientific_reference_results.json` (archivo fuera del alcance de T1;
  se anota en la limitación del hallazgo). O2 22,1 % solo para muestras 5 y 6 (frase de p.173) y presión solo para 5.
  Nomenclature PDF p.1 no define "Mapped"; esa definición viene de DoD Tabla 4. El asistente conserva
  `limitations` como texto (compatibilidad con el frontend actual).
- Pendiente: T3 (verificación independiente de citas), corregir la página en `scientific_reference_results.json`,
  textos del frontend que aún dicen que S1/C2 no están documentados (`i18n.tsx`: overview.scope3, limits.cannot3).
- T4/T5 (writer B, ruta delegada): navegación por hash (`#Findings/<id>`, `#Viewer/<id>`); pantallas en
  `frontend/src/screens/` (SafetyOverview, FindingsExplorer, FindingDetail, Ranked, Compare, Evidence, Assistant,
  Limitations); componentes en `ui.tsx` (EvidenceTypeBadge, LevelBadge, SourceCitation, WarningBanner,
  IncompleteBadge); diccionarios divididos en `i18n.es.ts` / `i18n.en.ts`; textos obsoletos sobre S1/C2 corregidos
  (cita DoD Tabla 2). Pestaña "Contexto científico" retirada: los resultados publicados están en los hallazgos.
  Docs: README, demo-script, data-lineage, implementation-plan. Checks observados: `uv run pytest -q` 58 passed;
  `npm run lint` sin advertencias; `npm run build` ok. Sin prueba RED: el frontend no tiene runner de pruebas.
- Brechas del backend detectadas (sin corregir, fuera del alcance de writer B): con `sequence_id`, preguntas no
  reconocidas reciben la descripción de la secuencia en lugar de `not_available`; la búsqueda por palabras clave
  responde a preguntas fuera de alcance ("color favorito de la tripulación" → F-urban2019-014).
