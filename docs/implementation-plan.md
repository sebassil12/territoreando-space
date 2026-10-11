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
