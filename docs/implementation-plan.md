# Plan de implementación y backlog

El producto se reencuadra como dashboard **findings-first** (ver `AGENTS.md`, Misión y Flujo de producto). Lo ya
construido pasa a ser la **capa de evidencia**. Brechas detalladas: `docs/gap-analysis.md`.

## Historial: capa de evidencia (completada)

| Fase | Entregable | Estado |
|---|---|---|
| 0 Contexto | docs/project-context.md, sources.md | hecho |
| 1 Normalización | catálogos de secuencias / fotogramas / calibración, contrastados con continuidad_series.csv | hecho |
| 2 Backend | FastAPI, envoltorio `{data, source, warnings, quality}` | hecho |
| 3 Dashboard | React + Vite + Tailwind: resumen, catálogo, visor, detalle del fotograma, análisis, ciencia, limitaciones | hecho |
| 4 Métricas de imagen | frame_metrics.csv (solo píxeles / intensidad) | hecho |
| 5 Calibración | detección de rejillas, estado `pending`; sin conversión | parcial (por diseño) |
| 6 Referencias publicadas | scientific_reference_results.json con números de página | hecho |
| 7 Asistente | determinista, basado en fuentes; Observation / Interpretation / Evidence / Limitations | hecho |
| 8 Pruebas | pytest: pipeline, API, asistente | hecho |
| 9 Demo y docs | README, guion de demo, limitaciones, linaje | hecho |
| 10 Locale de la UI | `frontend/src/i18n.tsx`, `es` por defecto, `en` disponible | hecho |
| 11 Reencuadre findings-first | misión, alcance, reglas 11–17, brechas, backlog, MVP (solo documentación) | hecho |

## MVP findings-first

Objetivo: que una persona abra el dashboard, vea hallazgos jerarquizados con criterio visible, entienda su confianza
y relevancia para la seguridad, inspeccione la evidencia citada, compare condiciones y reciba una interpretación
etiquetada y basada en fuentes. Sin base de datos y sin servicios nuevos.

### Esquema mínimo de un hallazgo (propuesto)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string estable, p. ej. `F-urban2019-001` | único |
| `statement` | texto | transcrito o parafraseado fielmente de la fuente; nunca redactado desde píxeles |
| `category` | enum: `published_result` · `published_observation` · `published_conclusion` | refleja el tipo de afirmación en la fuente |
| `conditions` | objeto: `material`, `oxygen`, `flow`, `pressure`, `scale`, `flight` (cada uno valor + unidad o vacío) | solo valores publicados; vacío si la fuente no lo reporta |
| `sources` | lista de `{file, page, section?}` | al menos una; obligatoria |
| `confidence` | enum (ver criterios) + `confidence_rationale` | justificación obligatoria; sin números |
| `safety_relevance` | enum (ver criterios) + `safety_rationale` | justificación obligatoria; nunca predicción de riesgo |
| `evidence` | lista de `{type: reference\|sequence\|frame, id, link: documented\|illustrative, note}` | `documented` solo con mapeo citado |
| `reference_ids` | IDs de `scientific_reference_results.json` relacionados | opcional |
| `limitations` | texto | obligatorio (al menos "aplica solo a sus condiciones de ensayo") |

Ejemplo **solo ilustrativo** (citado de `data/scientific_reference_results.json`, `fact-led`, urban2019 p.173; las
categorías asignadas son un *placeholder* pendiente de los criterios aprobados):
`statement`: "The sample was illuminated with a green LED for 0.4 s every 2 s so the pyrolysis char front could be
seen." · `category`: `published_observation` · `confidence`: `<pendiente>` · `safety_relevance`: `<pendiente>` ·
`evidence`: `[{type: sequence, id: S1-C2-raw-jpeg-part1, link: illustrative, note: "picos periódicos de intensidad"}]`.

### Criterios de categorías (propuesta, requiere aprobación — D2)
- **Confianza** (respaldo que la *fuente* da a la afirmación):
  - `direct_measurement` — la fuente reporta el valor medido en el ensayo de vuelo.
  - `derived_or_modeled` — la fuente lo atribuye a modelado o análisis posterior.
  - `qualitative_observation` — descripción cualitativa sin valor medido.
  - `context_only` — condición de ensayo u otro vuelo/escala; no es un resultado de Saffire-II.
- **Relevancia para la seguridad** (según la fuente, no predicción):
  - `design_relevant` — la fuente lo relaciona con diseño de materiales o de cabina.
  - `operations_relevant` — la fuente lo relaciona con detección, supresión u operación.
  - `background` — explica el fenómeno; sin vínculo directo citado con seguridad.
  - `unassessed` — aún no evaluado; valor por defecto.
- **Ranking por defecto:** `safety_relevance` (design > operations > background > unassessed), luego `confidence`
  (direct > derived > qualitative > context), luego `id`. La respuesta de la API incluye el criterio aplicado.

### Almacenamiento
`data/findings.json`, transcrito a mano con citas, versionado, cargado en memoria por `create_app` (igual que
`scientific_reference_results.json`). Sin base de datos. Un archivo faltante produce advertencia, no fallo.

### API propuesta (dentro de `create_app`, con `envelope(...)`)
| Endpoint | Propósito |
|---|---|
| `GET /api/findings?sort=&category=&confidence=&safety_relevance=` | lista jerarquizada; `data.ranking_criteria` explícito |
| `GET /api/findings/{id}` | detalle; 404 si no existe |
| `GET /api/findings/{id}/evidence` | evidencia resuelta (referencias, secuencias, fotogramas) con `link` |
| `GET /api/findings/compare?ids=a,b` | condiciones lado a lado; vacíos se mantienen vacíos |
| `POST /api/assistant` (extendido) | acepta `finding_ids`; responde con IDs citados y etiqueta "Interpretación (IA)" |

### Flujo de UI
Lista de hallazgos jerarquizada (criterio visible) → detalle (afirmación, fuente, confianza y relevancia con
justificación, limitaciones) → evidencia (referencia publicada; secuencia en el visor existente vía `#Viewer/<id>`,
marcada `illustrative` cuando corresponda) → comparación de condiciones → interpretación (IA).

### Interpretación por IA en el MVP
- Entrada: solo hallazgos cargados (y sus referencias). Salida: resumen/explicación con IDs de hallazgo citados,
  etiqueta **Interpretación (IA)**, sección de limitaciones.
- Rechaza: inferencia física desde píxeles, valores físicos nuevos, predicciones de riesgo, asignación de material o
  muestra a carpetas. Sin hallazgo de respaldo → "Not available in the loaded sources."
- **Decisión abierta (D1):** LLM restringido a los hallazgos vs. extensión del asistente determinista. No se decide
  aquí.

### Fuera del MVP
Calibración píxel→mm; detección de fotogramas con LED; enmascarado de la banda de texto TIFF; nuevas métricas de
imagen; mapeo carpeta→muestra sin fuente; fuentes adicionales más allá de urban2019; autenticación, base de datos,
despliegue; cualquier predicción de riesgo, simulación o gemelo digital.

## Estado del MVP (rama `feat/findings-mvp`)

El esquema, los criterios y la API propuestos arriba se implementaron con cambios; la referencia vigente es
`docs/data-dictionary.md` (sección `findings.json`) y el README (tabla de API). Diferencias principales: categorías
`high/medium/low` con justificación, `evidence_type` en lugar de `category`, archivo en `data/processed/findings.json`,
`/api/findings/ranked` y `/api/compare` en lugar de `/api/findings/compare`.

| ID | Estado | Evidencia |
|---|---|---|
| P0-1 Esquema de hallazgo | hecho | `docs/data-dictionary.md`, `backend/findings.py` |
| P0-2 `findings.json` | hecho (24 hallazgos) | `data/processed/findings.json`, `tests/test_findings.py` |
| P0-3 Criterios de confianza y relevancia | hecho; aprobación del equipo pendiente | `docs/data-dictionary.md` |
| P0-4 API de hallazgos | hecho | `backend/routes/findings.py`, `backend/analysis.py` |
| P0-5 UI findings-first | hecho | inicio = Resumen de seguridad; pantallas en `frontend/src/screens/` |
| P0-6 Interpretación etiquetada | hecho (asistente determinista, sin LLM) | `backend/assistant.py`, `tests/test_assistant.py` |
| P1-1 Comparación de condiciones | hecho | pestaña Comparación, `GET /api/compare` |
| P1-2 Evidencia de imagen enlazada | hecho (siempre ilustrativa) | detalle del hallazgo → `#Viewer/<id>` |
| P1-3 Filtro del asistente ajustado | hecho | `backend/assistant.py` |
| P1-4 Guion de demo findings-first | hecho | `docs/demo-script.md` |
| P1-5 Requisitos oficiales | pendiente (tras el 28 de octubre de 2026) | — |
| T3 Verificación independiente de citas | pendiente | `odd/tasks/findings-mvp.md` |
| P2-1 … P2-4 | pendiente (P2-4 resuelto en parte por DoD Tabla 2) | — |

Decisiones: D1 resuelta (asistente determinista extendido, sin LLM); D3 resuelta con `SAFFIRE-II DoD.docx`, Tabla 2
(`F-dod-001`); D2 y D4 siguen abiertas. Limitaciones conocidas del asistente: la búsqueda por palabras clave puede
responder con hallazgos poco pertinentes a preguntas fuera de alcance (p. ej. "color favorito de la tripulación"
devuelve `F-urban2019-014`), y con una secuencia de contexto cualquier pregunta no reconocida recibe la descripción
de la secuencia en lugar de `not_available`.

## Backlog priorizado

### P0 — MVP findings-first
| ID | Resultado | Criterios de aceptación | Depende de |
|---|---|---|---|
| P0-1 | Esquema de hallazgo documentado | Esquema en `docs/data-dictionary.md`; campos y enums como en el MVP | D2 |
| P0-2 | `data/findings.json` con hallazgos transcritos de urban2019 | Cada hallazgo con archivo + página; prueba que falla si falta cita, categoría inválida o justificación vacía; linaje actualizado | P0-1 |
| P0-3 | Criterios de confianza y relevancia aprobados | Criterios en este documento aprobados por el equipo; cada hallazgo con justificación | D2 |
| P0-4 | API de hallazgos (lista jerarquizada, detalle, evidencia) | Rutas en `create_app`; `ranking_criteria` en la respuesta; 404 para IDs desconocidos; archivo faltante → advertencia; pruebas de API | P0-2, P0-3 |
| P0-5 | UI findings-first | Pestaña inicial "Hallazgos"; detalle con fuente, confianza, relevancia, limitaciones; enlace a evidencia/visor; textos en `i18n.tsx` (`es`/`en`); lint y build pasan | P0-4 |
| P0-6 | Interpretación etiquetada de hallazgos | Respuestas citan IDs de hallazgo; etiqueta "Interpretación (IA)"; pruebas de rechazo (temperatura, riesgo predictivo, mm desde píxeles, material de carpeta) | P0-4, D1 |

### P1 — Completar el flujo
| ID | Resultado | Criterios de aceptación | Depende de |
|---|---|---|---|
| P1-1 | Comparación de condiciones | `GET /api/findings/compare`; vista lado a lado; vacíos visibles como "no reportado" | P0-4 |
| P1-2 | Evidencia de imagen enlazada | Desde el hallazgo, abrir secuencia/fotograma en el visor existente con etiqueta `documented`/`illustrative` | P0-5 |
| P1-3 | Filtro del asistente ajustado | Preguntas sobre relevancia citada o valores publicados en mm/s ya no se rechazan; la predicción de riesgo y la inferencia física siguen rechazadas; pruebas | P0-6 |
| P1-4 | Guion de demo findings-first | `docs/demo-script.md` recorre hallazgo → evidencia → comparación → interpretación | P0-5 |
| P1-5 | Alinear con requisitos oficiales | Revisión tras el 28 de octubre de 2026; brechas nuevas añadidas aquí | — |

### P2 — Fortalecer la evidencia (antes "próximas tareas")
| ID | Resultado | Criterios de aceptación | Depende de |
|---|---|---|---|
| P2-1 | Validar píxel→mm en una secuencia con su rejilla de 30 mm | Medición y distorsión documentadas; solo entonces `validated` para esa secuencia | — |
| P2-2 | Detección de fotogramas con LED y enmascarado de banda de texto TIFF | Métricas separan fotogramas iluminados/oscuros; banda excluida; pruebas sintéticas | — |
| P2-3 | Revisar fuentes no procesadas | Decidir si `SaffireIIStitchedCO2V7.pdf` y `Saffire-II Sample 1 TM Graphs.docx` aportan hallazgos citables | — |
| P2-4 | Mapeo documentado carpeta→muestra | Solo con fuente citada; permitiría vínculos `documented` | D3 |

## Decisiones abiertas
- **D1** — Interpretación: LLM restringido a hallazgos citados vs. asistente determinista extendido (costo, clave de
  API, reproducibilidad, riesgo de alucinación).
- **D2** — Aprobación de las categorías y criterios de confianza y relevancia propuestos arriba.
- **D3** — Obtener un mapeo documentado S1…S9 / F1 / F2 → número de muestra (p. ej. `i_Investigation.txt`,
  `s_PSI-99-2.txt` u otra fuente de la NASA); sin él, la evidencia de imagen es solo ilustrativa.
- **D4** — Alcance de transcripción del MVP: solo `results` y `facts` existentes como semilla, o lectura completa de
  urban2019 para hallazgos adicionales.

## Model and Scenario Engine status

| Deliverable | Status |
|---|---|
| Twin increment 1 | Pure Bhattacharjee thin-fuel dimensionless branch; `/api/twin/models` and `/api/twin/evaluate`; unit/API tests and contract docs | implemented; equation verified, scientifically unvalidated |
| Bhattacharjee 2016 investigation | Source/equation/parameter review for critical opposed-flow extinction velocity | investigated; equation verified; numerical reproduction incomplete; no implementation |
| Urban 2019 reproducibility audit | Sample 5 analytical equation, input provenance and independent calculation review | audited sources insufficient; absolute speed/error unresolved; no implementation |
| Scenario Engine | Version 1 contracts, registry, assessment, provenance/unit checks and dimensionless adapter | **IMPLEMENTED**; research evaluators **BLOCKED**; [contract](scenario-engine.md) |
| Guided Digital Twin | Model-first React flow, two-input dimensionless form, simple results, Advanced/Scientific details, schematic orbital 3D and revision invalidation | **IMPLEMENTED** at `#Twin`; no numeric scientific defaults or dynamic physics; [scope](scenario-engine.md#implemented-scenario-builder) |

Status vocabulary: **IMPLEMENTED** means available software; **BLOCKED** means
evaluation is refused with explicit reasons; **PENDING** means planned work;
**VALIDATED** means scoped experimental validation. No initial model is
experimentally **VALIDATED**. Equation verification and passing software checks
are separate evidence, not experimental validation.

## Twin implementation versus validation

Implemented: a steady 0D plus-root evaluator with explicit dimensionless user assumptions, finite-input
validation, mathematical branch states and `quality="modelled_unvalidated"`. It works without raw assets
and does not alter offline evidence artifacts. See [dimensionless model API](dimensionless-model.md).

Also implemented: registry and assessment of all three scenario models,
exact-output selection, full blocker reports, scope/provenance checks, canonical
units, scenario fingerprints, and routing only to the existing dimensionless
branch. Existing endpoints retain their original contracts. The React builder now
consumes these endpoints, preserves structured errors/provenance and rejects late
responses after edits. Focused Node tests and Python tests of actual frontend-generated
requests cover producer/consumer consistency; browser checks cover evaluation,
edit invalidation, delayed responses, incompatibility and narrow-screen layout.

Verified: equation transcription against NASA NTRS 20040053557, Eq. (5), printed p.202.
Software tests cover algebraic behavior and API contracts; they are not experimental validation.

Pending: documented dimensional parameters, experimental validation, and any 1D
evolution. Urban remains unimplemented; [the audit](urban-reproducibility-audit.md) verified Eq. (2) in
publisher HTML, but its printed PDF page and required thermal inputs remain unresolved.
Physical extinction diagnostics remain disabled because of
the source inconsistency. No materials, temperature, heat release, risk or CFD are implemented.

## Bhattacharjee 2016 decision

Research is documented in [sources](sources.md#bhattacharjee-2016-investigation).
The equation is verified and several documented parameters were located, but the
published theoretical critical velocities of 7.5 and 10 mm/s in Table 2.1 could not be reproduced with
complete traceability. Their numeric **Published reference** values and page are
recorded in the source investigation; they are not project model outputs.

Do not implement the 2016 model at this stage or describe it as experimentally
validated by this project. A future parametric evaluator may accept explicit inputs,
without presets or assumed values. It requires a complete parameter/source audit
before any claim of reproducibility. Equation and software verification remain
separate from experimental validation.

## Urban 2019 decision

The [reproducibility audit](urban-reproducibility-audit.md) is complete for the
accessible sources. No absolute prediction or experimental validation was
established. Sample 5 lacks a complete thermal parameter set; Eq. (6) lacks a
numerical prefactor, and the published pyrolysis length does not independently
close a prediction of that length. Further work requires the complete source PDF
and case-specific thermal inputs with units and page references. Do not introduce
presets, fit constants to the target result, or implement an Urban evaluator now.


## Next model increment

The [first Scenario Engine increment](scenario-engine.md#first-implementable-increment)
and [guided 3D Scenario Builder](digital-twin-3d.md)
are **IMPLEMENTED**. The editor consumes assessment, provenance, revision fingerprints
and output capability gates. Its orbital scene contains a fixed illustrative flame,
generic sample and directional arrows. They are not to scale and represent no
predicted flame dynamics. The mathematical scene never receives numeric physical inputs or
outputs; presentation controls do not alter scientific provenance.

The next increment is **PENDING**: define a source-backed transient/spatial model's
applicability, complete parameters, initial/boundary conditions and time-dependent
output contract before adding predictive physical animation. Reviewed parameter/derivation
records and a reproducible benchmark are prerequisites for defensible dimensional
predictions. Observation comparison additionally requires documented sample/sequence
mapping, continuous timestamps and manually validated calibration. Software tests
remain distinct from experimental validation. The 2016 and Urban evaluators remain
**BLOCKED**, including with complete hypothetical inputs; this UI does not unlock them.

## SAFFIRE playback increment

**IMPLEMENTED:** version 1 playback catalog and case endpoints; source-based
startup derivation; three selectable SAFFIRE cases; timeline/play/pause/reset;
derived longitudinal 3D markers, envelope and traversed-region proxy.
**EXPERIMENTAL:** published steady inputs, with inherited-transcription warning.
**DERIVED:** local constant-rate anchors/positions and display duration.
**SCHEMATIC:** flame cross-section/color and char appearance.
**BLOCKED:** Urban/2016 analytical evaluators and general physical prediction.
**PENDING:** independent PDF review, traceable time series and uncertainty,
explicit gap handling and calibrated alignment; then source-backed transient
outputs. **VALIDATED:** no experimental model.
See [implemented playback contract and evidence](saffire-playback.md).

## Procedural SAFFIRE rendering increment

**IMPLEMENTED:** GPU core/envelope, flow-oriented procedural motion, background
distortion, virgin/active/char surface, compact metrics and playback-rate controls.
**EXPERIMENTAL / DERIVED / PHYSICS-DRIVEN:** existing published references and
local kinematic mapping; no new physical evaluator. **PHYSICALLY-INSPIRED:**
appearance and fluctuations. **SCHEMATIC:** transverse dimensions and view.
**BLOCKED:** unsupported analytical models and quantitative flame/temperature
predictions. **PENDING:** calibrated transient observations, physical appearance
model and reproducible benchmark. **VALIDATED:** no experimental model validation.
See [renderer implementation](digital-twin-3d.md#procedural-combustion-renderer-implemented).

## NASA Evidence Replay status

**IMPLEMENTED:** additive comparison endpoint and Twin mode; camera/variant
selection; source-frame index; asset availability and gap warnings; cited geometry
review; explicit observation/derived/visual classifications; schematic fallback.
**BLOCKED BY EVIDENCE:** exact Urban Vf/lp review, calibrated motion comparison,
synchronization and fidelity errors. **VALIDATED:** no scientific model.
See [audit and remaining evidence requirements](nasa-evidence-replay.md).


### Minimal first experimental-comparison plan

Follow the [Sample 5/C2 decision gates](saffire2-validation-audit.md#minimal-validation-plan-and-decision-gates):
verify the original publication, acquire the bounded C2 case, review telemetry/image
registration, validate camera-specific calibration, and compare independently
annotated held-out observations. Inspect the full experiment, but evaluate the
current 3D only over a justified steady window. Whole-burn predictive validation
requires capabilities the current renderer does not provide. Status: audit complete;
experimental validation and all implementation changes remain pending.
