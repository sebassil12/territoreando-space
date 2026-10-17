# territoreando-space — Flame in Freefall

**Dashboard de hallazgos sobre seguridad contra incendios en microgravedad** para el reto del NASA Space Apps
Challenge 2026 *Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data*.

## De qué trata
Un dashboard interactivo con IA que resume, jerarquiza e interpreta **hallazgos científicos** de combustión en
microgravedad (experimento Saffire-II de la NASA, Cygnus, misión CRS OA-5) para entregar insights trazables sobre
seguridad contra incendios en vuelos espaciales tripulados. La unidad central es el hallazgo: cada uno cita su fuente
(archivo + página), declara su confianza y su relevancia para la seguridad con criterios documentados, enlaza su
evidencia y puede compararse con otros por condiciones de ensayo.

Las secuencias de imágenes, su continuidad temporal, el inventario de calibración y las métricas de píxeles son la
**capa de evidencia** que respalda los hallazgos.

### Estado actual
- **Capa de hallazgos (MVP):** 24 hallazgos transcritos a mano con cita (`data/processed/findings.json`), condiciones
  citadas por muestra (`data/processed/sample_conditions.csv`), ranking por reglas con desglose visible, comparación
  de condiciones sin conclusiones y asistente determinista que cita IDs de hallazgo (sin LLM).
- **Capa de evidencia:** catálogo de secuencias con calidad temporal, visor fotograma a fotograma con procedencia,
  métricas de píxeles y valores de referencia publicados con página.
- **Interfaz:** Resumen de seguridad (inicio) → Hallazgos → Priorizados → Comparación → Evidencia → Asistente →
  Limitaciones. Pendiente: verificación independiente de las citas (T3 en `odd/tasks/findings-mvp.md`).

> No es un simulador CFD, ni un predictor universal de riesgo de incendio, ni un gemelo digital, ni un sistema de
> seguridad certificado, ni una galería de imágenes. Las imágenes solo respaldan hallazgos.

## Qué considerar antes de contribuir
1. **Los datos crudos no están en Git.** Las imágenes, archivos comprimidos, inventario y artículo de SAFFIRE-II
   (~2,4 GB) están excluidos por `.gitignore`. Solicite `SAFIRE-II Project.zip` a los responsables del proyecto
   (almacenamiento compartido del equipo) y descomprímalo en la raíz del repositorio para que exista `./descompressed/`.
   Los catálogos generados en `data/processed/` *sí* están versionados, por lo que las vistas de catálogo funcionan
   sin las imágenes.
2. **La honestidad científica es parte del producto.** Nunca mostrar temperatura, tasa de liberación de calor,
   oxígeno, riesgo de incendio ni longitudes en mm/cm derivadas de píxeles. Las etiquetas de carpeta S1…S9, C1/C2 y F1/F2 se
   interpretan solo según `SAFFIRE-II DoD.docx`, Tabla 2 (hallazgo `F-dod-001`); el vínculo carpeta local → registro
   PSI se hace por etiqueta compartida. Toda afirmación científica requiere una fuente (archivo + página o tabla). Ver [docs/scientific-limitations.md](docs/scientific-limitations.md).
3. **Nunca combinar variantes.** Las versiones Raw, Mapped, ICMAD y TIFF de la misma ventana temporal son secuencias
   distintas.
4. **Los archivos originales son de solo lectura.** Todo lo derivado se regenera con `pipeline/`.
5. **Ramas.** Trabajar en `development` (o en ramas de funcionalidad creadas desde ella); `main` es para versiones
   revisadas.
6. **Trabajo con agentes de IA.** [AGENTS.md](AGENTS.md) es la fuente única de verdad sobre arquitectura, comandos y
   reglas; `CLAUDE.md` lo importa. Indique a cualquier agente de código que lo lea antes de pedirle cambios.
7. **Requisitos del reto.** La lista oficial de entregables se publica el 28 de octubre de 2026; nada en este
   repositorio la da por supuesta.

## Estructura
```
descompressed/        archivos originales de la NASA (solo lectura; no se modifican)
pipeline/             build_catalog.py, compute_metrics.py
data/processed/       catálogos y métricas generados (CSV) + findings.json y sample_conditions.csv (a mano)
data/scientific_reference_results.json   valores transcritos de urban2019.pdf (con páginas)
backend/              aplicación FastAPI + asistente determinista
frontend/             React + TypeScript + Vite + Tailwind (pantallas en frontend/src/screens/)
tests/                suite de pytest
docs/                 contexto, diccionario de datos, linaje, limitaciones, brechas, guion de demo, plan
AGENTS.md             arquitectura + reglas para agentes de IA (CLAUDE.md lo importa)
```

## Requisitos
Python 3.11+ con [uv](https://docs.astral.sh/uv/), Node 20.19+ (or 22.12+).

## Rutas de datos
Los datos crudos se esperan en `./descompressed/` (descomprima `SAFIRE-II Project.zip` en la raíz del proyecto; ya
contiene esa carpeta). Para la API se puede cambiar con `SAFFIRE_RAW_DIR=/ruta/a/descompressed`. Las imágenes
faltantes no provocan errores: los fotogramas se marcan como `missing` / `path_only` y la interfaz muestra una
advertencia.

## Qué archivos lee la aplicación
El backend carga en memoria al arrancar (sin base de datos):

| Archivo | Capa | Origen |
|---|---|---|
| `data/processed/sequence_catalog.csv`, `frame_catalog.csv`, `calibration_catalog.csv` | evidencia | `pipeline/build_catalog.py` |
| `data/processed/frame_metrics.csv` | evidencia | `pipeline/compute_metrics.py` |
| `data/scientific_reference_results.json` | referencias publicadas | transcripción manual de urban2019 |
| `data/processed/findings.json` | hallazgos | transcripción manual con cita |
| `data/processed/sample_conditions.csv` | condiciones por muestra | transcripción manual (DoD Tabla 1–2, urban2019) |
| `descompressed/` | imágenes y documentos | solo lectura; opcional para las vistas de catálogo y hallazgos |

`docs/data-inventory.csv` no lo lee el runtime.

## Cómo se crea y actualiza la capa de hallazgos
1. Leer la fuente local (`descompressed/urban2019.pdf`, `SAFFIRE-II DoD.docx`, manifiestos) y transcribir el hallazgo
   a mano en `data/processed/findings.json`: `source_path`, `source_location` (página, sección o tabla),
   `evidence_type`, `confidence` y `safety_relevance` con su justificación, `limitations`, `data_status`.
   Criterios de las categorías: `docs/data-dictionary.md`, sección `findings.json`.
2. Si el hallazgo depende de condiciones por muestra, actualizar `data/processed/sample_conditions.csv` con su cita.
3. `backend/findings.py` valida cada hallazgo al cargar; uno inválido se excluye con advertencia.
4. `uv run pytest -q tests/test_findings.py` debe pasar (cita y enums obligatorios, sin unidades físicas en
   métricas de imagen, sin mezclar variantes ni muestras ajenas).

Ningún hallazgo se calcula a partir de píxeles ni se genera con un LLM.

## Generar los datos (≈15 s)
```bash
uv sync
uv run python -m pipeline.build_catalog --raw descompressed     # 21 secuencias, 69.380 fotogramas
uv run python -m pipeline.compute_metrics --raw descompressed   # 1 de cada 5 fotogramas (+ posteriores a huecos y el último)
uv run python -m pipeline.build_inventory                       # inventario archivo por archivo → docs/data-inventory.csv
```

## Ejecutar
```bash
uv run uvicorn backend.app:app --port 8000          # API → http://localhost:8000/docs
cd frontend && npm install && npm run dev           # UI  → http://localhost:5173
```
Enlaces directos: `http://localhost:5173/#Viewer/S1-C2-raw-jpeg-part1`, `http://localhost:5173/#Findings/F-data-001`,
`#Ranked`, `#Compare`, `#Evidence`, `#Assistant`, `#Limitations`.

## Pruebas y lint
```bash
uv run pytest -q
uv run ruff check pipeline backend tests
cd frontend && npm run lint && npm run build
```

## API (actual)
Todas las respuestas: `{ "data", "source", "warnings", "quality" }`.

| Endpoint | Propósito |
|---|---|
| `GET /api/health` | estado de los catálogos |
| `GET /api/investigations` | resumen de Saffire-II (según urban2019) |
| `GET /api/sequences` | listado; filtros `group, camera, file_type, processing_variant, temporal_quality` |
| `GET /api/sequences/{id}` | una secuencia + advertencias |
| `GET /api/sequences/{id}/frames?offset&limit&step` | fotogramas |
| `GET /api/frames/{frame_id}` | detalle del fotograma + métricas |
| `GET /api/frames/{frame_id}/image` | imagen (TIFF convertido a PNG) |
| `GET /api/calibrations` | rejillas de distorsión y su estado |
| `GET /api/sources` | archivos fuente y disponibilidad |
| `GET /api/metrics/{id}` | serie temporal de métricas |
| `GET /api/references` | valores de referencia publicados |
| `GET /api/findings` | hallazgos; filtros `theme, sample, material, evidence_type, confidence` |
| `GET /api/findings/ranked` | hallazgos ordenados por reglas con `score_breakdown` y `ranking_criteria` (no es probabilidad ni riesgo) |
| `GET /api/findings/{id}` | hallazgo + condiciones de la muestra + secuencias relacionadas con advertencias; 404 si no existe |
| `GET /api/conditions` | condiciones citadas por muestra |
| `GET /api/compare?samples=5,9` o `?finding_ids=…` | condiciones lado a lado con factores que difieren, faltan o están en conflicto; sin conclusiones |
| `GET /api/twin/playback-cases` | Versioned published-reference playback catalog with provenance and derived anchors |
| `GET /api/twin/playback-cases/{case_id}` | One available/unavailable SAFFIRE playback case |
| `GET /api/twin/models` | Implemented equation, definitions, assumptions, versions and source |
| `POST /api/twin/evaluate` | Dimensionless cases and mathematical branch states |
| `GET /api/twin/scenario-models` | Three-model registry, requirements, evidence and implementation availability |
| `POST /api/twin/scenarios/assess` | Version 1 scenario: compatibility, blockers, exact permitted outputs and fingerprint |
| `POST /api/twin/scenarios/evaluate` | Reassess scenario/fingerprint and evaluate only an eligible dimensionless case |
| `POST /api/assistant` | `{question, sequence_id?}` → status (`answered` / `refused` / `not_available`), observation, interpretation, evidence (IDs de hallazgo), limitations |

## Qué está disponible y qué falta
- **Disponible:** resultados publicados de urban2019 y del DoD como hallazgos citados; condiciones por muestra
  (material, espesor, flujo, ignitor; O₂ y presión solo donde la fuente los reporta); 21 secuencias de imagen locales.
- **Falta:** datos de sensores como números (O₂, CO₂, presión, temperaturas; `F-data-006`); ≈71 % de los JPEG recibidos
  (`F-data-002`); imágenes de las muestras 2 y 7 y del pre-flujo; calibración píxel→mm validada (`F-data-005`).

## Limitaciones de los datos (resumen)
- `raw_id` se interpreta como milisegundos (inferido del espaciado de ~33 ms y de las cámaras a 30 fps, urban2019 p.173).
- Flujo de la muestra 6 en conflicto: 25 cm/s (urban2019 p.173) frente a 30 cm/s (DoD Tabla 1); no se resuelve (`F-data-001`).
- Los fotogramas locales cubren solo una parte de cada quema (p. ej. S9: ≈167 s de 900 s; `F-data-003`).
- Las series Mapped TIFF tienen huecos de hasta 183 s → no aptas para calcular tasas (`F-data-004`).
- Las variantes Raw / Mapped / ICMAD de la misma ventana son secuencias separadas y nunca se combinan.
- La calibración está `pending`: todas las medidas de imagen están en píxeles.
- La prioridad del ranking es un orden de lectura, no una probabilidad de incendio ni un nivel de riesgo certificado.
- Ninguna predicción fuera de las condiciones ensayadas (urban2019 p.181, conclusión 6; `F-urban2019-009`).

Lista completa: [docs/scientific-limitations.md](docs/scientific-limitations.md). Demo: [docs/demo-script.md](docs/demo-script.md).

## Independent model API and Scenario Engine

The React dashboard explores Saffire-II microgravity combustion images, temporal continuity,
frame provenance, pixel statistics and separately labeled published scientific references.
The twin implements a **dimensionless steady 0D model**: the thermally thin
plus-root branch of Bhattacharjee et al., NASA NTRS 20040053557, Eq. (5), p.202.

The equation has been verified against the source PDF; the implementation is **scientifically
unvalidated**. It evaluates explicit hypothetical inputs, without materials, dimensional speed,
physical extinction diagnosis, temperature, heat release, risk or CFD. The React Scenario Builder
provides a guided two-input flow, interactive schematic 3D and mathematical results; transient 1D simulation and a
calibrated/synchronized digital twin remain pending.
See [model equation, assumptions and API contract](docs/dimensionless-model.md).

The **Scenario Engine, guided React Scenario Builder and schematic 3D are IMPLEMENTED**: version 1 scenarios, a registry
of three models, compatibility/requirements/evidence assessment and an adapter
to the existing dimensionless evaluator. Bhattacharjee 2016 and Urban 2019 are
**BLOCKED**, even with complete hypothetical inputs; missing inputs and source
limitations are reported explicitly. Reviewed input evidence, sweeps,
dimensional predictions and a calibrated dynamic twin are **PENDING**. No physical model is
experimentally **VALIDATED** by this project.
See [Scenario Engine contract and examples](docs/scenario-engine.md#implemented-api-contract).


Open **Digital Twin** at `http://localhost:5173/#Twin`. The initial **SAFFIRE evidence
playback** mode supports SAFFIRE-1, SAFFIRE-3 and SAFFIRE-2 Sample 5. Choose a case,
inspect its published source/quality, then Play, Pause, Reset or scrub the timeline.
Front/base positions and longitudinal extent use derived steady kinematics; this
is not continuous measured motion, CFD or a reproduction of the Urban equation.
Source values/pages are inherited transcriptions, not newly verified against the PDF.
See [playback derivation, API and limitations](docs/saffire-playback.md).

Choose **Explore a mathematical model**, then an exploration and
explicitly accept its displayed hypothetical setup. The dimensionless flow asks
only for `eta_g` and `radiation_number`, with plain-language help and no numeric
defaults. **Calculate my scenario** checks compatibility before evaluation.
Advanced conditions and Scientific details preserve all scientific evidence.
Every scenario edit invalidates previous results.

In mathematical mode, the central Three.js scene supports orbit, zoom and display orientation. Its
purple flame is fixed, schematic and not to scale; it never reacts to mathematical
results or physical numeric inputs. Direction arrows and gravity/shape labels
reflect declarations only. No experimental data drives this scene. A browser
without WebGL can still calculate and inspect evidence.
See the [guided demo](docs/demo-script.md#scenario-builder),
[3D classification and technology](docs/digital-twin-3d.md) and
[contracts](docs/scenario-engine.md#implemented-api-contract).

If port 8000 is occupied, run the API and proxy on another port in separate terminals:

```bash
uv run uvicorn backend.app:app --reload --port 8107
cd frontend
FLAME_API_TARGET=http://127.0.0.1:8107 npm run dev
```

The default proxy still targets port 8000. Run `cd frontend && npm test` for the
new focused interface tests, in addition to the existing Python, lint and build checks.

### Procedural SAFFIRE view

The SAFFIRE mode now renders GPU volumetric fire and a textured virgin/active/char
strip, with Play/Pause, Reset, 0.25x/0.5x/1x/2x and orbital controls. Front/base/length
follow derived evidence; color, noise, glow, flame shape and distortion are
**PHYSICALLY-INSPIRED**, not CFD or temperature predictions. Main-view metrics
remain compact; **Scientific details** retains quality/provenance and inherited
source-review limits. [Exact visual classifications](docs/digital-twin-3d.md#procedural-combustion-renderer-implemented).

### NASA Evidence Replay

Open **Digital Twin → NASA Evidence Replay** for source images on the left and the
existing schematic 3D on the right. Select a camera/processing variant to inspect
frames, filename-relative timestamps, gaps, stored pixel metrics and sources.
Missing assets produce explicit limitations. The exact Urban Vf/lp pairs remain
unverified, so this new mode does not animate them or claim synchronized playback
or quantitative fidelity. The existing playback and Scenario Builder remain.
See [evidence audit, API and remaining requirements](docs/nasa-evidence-replay.md).

`GET /api/twin/evidence-replay` supplies the additive comparison catalog. Restore
`descompressed/` or set `SAFFIRE_RAW_DIR` for actual images; committed catalog
availability is historical. No new dependencies or scientific model were added.
