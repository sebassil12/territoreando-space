# AGENTS.md

Instrucciones para agentes de código de IA (Claude Code, Codex) que trabajan en este repositorio.

## Misión

Construir, para el reto *Flame in Freefall* de NASA Space Apps 2026, un dashboard interactivo con IA que resuma,
jerarquice e interprete **hallazgos científicos** de combustión en microgravedad (SAFFIRE-II / PSI-99) y entregue
insights trazables sobre seguridad contra incendios en vuelos espaciales tripulados.

- **Unidad primaria del producto: el hallazgo científico** (una afirmación publicada, citada con archivo + página),
  junto con su nivel de confianza, su relevancia para la seguridad y su evidencia.
- **Imágenes, secuencias y archivos son evidencia de respaldo**, no el producto. El trabajo existente (normalización,
  metadatos de secuencias, calidad temporal, inventario de calibración, métricas de imagen) es la *capa de evidencia*.
- Cada afirmación cita su fuente y se etiqueta como: resultado publicado · dato observado · métrica derivada ·
  interpretación (por IA) · limitación.

### Qué NO es este producto
- No es un simulador CFD ni un modelo físico.
- No es un predictor universal de riesgo de incendio.
- No es un gemelo digital de ninguna nave o experimento.
- No es un sistema de seguridad certificado ni una herramienta de decisión operativa.
- No es una aplicación centrada en una galería de imágenes: las imágenes solo respaldan hallazgos.

## Flujo de producto

```
Hallazgo (jerarquizado, criterio visible)
   → Confianza y relevancia para la seguridad (categorías documentadas + justificación)
   → Evidencia (fuente citada; secuencias / fotogramas / referencias vinculadas)
   → Comparación de condiciones (O2, flujo, presión, material, escala, según la fuente)
   → Interpretación por IA (etiquetada, basada solo en hallazgos citados)
```

Estado: el flujo está **planificado**. Hoy existe la capa de evidencia (catálogo, visor, referencias publicadas,
asistente determinista). Ver `docs/gap-analysis.md` y `docs/implementation-plan.md`.

## Arquitectura

Los datos fluyen en un solo sentido. Cada capa solo lee la capa a su izquierda.

```
descompressed/ (raw, read-only, git-ignored)
   │
   ▼
pipeline/  ── offline, CLI ──►  data/processed/*.csv   (committed, reproducible)
                                data/scientific_reference_results.json (hand-transcribed, cited)
   │
   ▼
backend/   FastAPI, loads CSV/JSON into memory at startup ── /api/*
   │
   ▼
frontend/  React + TS + Vite + Tailwind v4, calls /api via Vite proxy
```

| Ruta | Responsabilidad | Notas |
|---|---|---|
| `pipeline/build_catalog.py` | inventario → catálogos de secuencias / fotogramas / calibración | las funciones puras (`interval_stats`, `assign_roles`, `temporal_quality`) tienen pruebas unitarias |
| `pipeline/compute_metrics.py` | estadísticas de píxeles por fotograma → `frame_metrics.csv` | solo píxeles / intensidad de 8 bits |
| `backend/app.py` | fábrica `create_app(processed, raw, references)` + rutas | toda respuesta JSON = `{data, source, warnings, quality}` |
| `backend/assistant.py` | preguntas y respuestas deterministas, basadas en fuentes | sin LLM; rechaza la inferencia física |
| `frontend/src/App.tsx` | estructura, pestañas, resumen, catálogo, ciencia, asistente, limitaciones | enlaces directos por hash `#Viewer/<sequence_id>` |
| `frontend/src/Viewer.tsx` | reproductor, procedencia, detalle del fotograma, gráfico de métricas (SVG simple) | el gráfico corta la línea en los huecos temporales |
| `frontend/src/i18n.tsx` | locale de la UI: diccionarios `es` / `en`, `I18nProvider`, `useT()` | `es` por defecto; todo texto visible pasa por `t('...')` |
| `frontend/src/api.ts` | tipos + funciones de consulta | refleja aquí las formas del backend |
| `tests/` | pytest: pipeline (datos sintéticos), API, asistente | las pruebas de la API usan los catálogos versionados |
| `docs/` | contexto, diccionario de datos, linaje, limitaciones, brechas, demo, plan | actualizar cuando cambie el comportamiento |
| `data/findings.json` | **planificado**: hallazgos transcritos a mano con cita (archivo + página) | no existe aún; ver `docs/implementation-plan.md` |
| rutas `/api/findings*` | **planificado**: listado jerarquizado, detalle, evidencia, comparación | no existen aún |

Sin base de datos, sin colas, sin microservicios. Mantenerlo así salvo que aparezca una necesidad medida.

## Comandos

```bash
uv sync                                              # Python deps
uv run python -m pipeline.build_catalog              # needs ./descompressed
uv run python -m pipeline.compute_metrics --step 5
uv run uvicorn backend.app:app --reload --port 8000
cd frontend && npm install && npm run dev            # http://localhost:5173

uv run pytest -q                                     # must pass
uv run ruff check pipeline backend tests             # must pass
cd frontend && npm run lint && npm run build         # must pass
```

Ejecute los tres checks antes de dar una tarea por terminada.

## Reglas científicas (no negociables)
1. No inventar hechos aeroespaciales, valores físicos, ecuaciones ni asignaciones de muestras o materiales.
2. Toda afirmación científica en la UI o la API cita una fuente (archivo + página). Los valores publicados viven solo en
   `data/scientific_reference_results.json` y se etiquetan como **Referencia publicada** (*Published reference*).
3. Mantener separadas las categorías: dato observado · métrica derivada de imagen · resultado publicado · interpretación.
4. Nunca inferir temperatura, tasa de liberación de calor, riesgo de incendio, oxígeno ni material a partir de píxeles.
5. `S1…S9`, `F1`, `F2` son etiquetas de carpeta, no números de muestra. `C1`/`C2` como cámaras es una *interpretación candidata*.
6. Nunca concatenar series Raw / Mapped / ICMAD / BIT / TIFF. Misma ventana temporal ⇒ `processing_variant`.
7. Las secuencias con huecos > 2× el intervalo mediano son `gap_detected` y no aptas para calcular tasas.
8. `calibration_status` nunca se fija en `validated` automáticamente. Ninguna salida en mm/cm sin un mapeo documentado y validado.
9. Los archivos bajo `descompressed/` son de solo lectura.
10. Los archivos faltantes deben producir advertencias, nunca fallos.

### Reglas a nivel de hallazgo (complementan, no reemplazan, las anteriores)
11. Todo hallazgo cita su fuente (archivo + página). Sin cita no hay hallazgo. El texto se transcribe o parafrasea
    fielmente de la fuente; nunca se redacta a partir de píxeles ni de conocimiento no citado.
12. La confianza y la relevancia para la seguridad son **categorías documentadas con criterios explícitos**
    (ver `docs/implementation-plan.md`) y siempre llevan una justificación textual. Nunca se usan puntuaciones
    numéricas inventadas ni probabilidades.
13. Toda jerarquización (ranking) expone su criterio y orden de desempate en la UI y en la API. Nada se ordena por
    un criterio oculto.
14. La interpretación por IA se etiqueta como **Interpretación (IA)**, se basa solo en hallazgos citados y cargados,
    cita los IDs de hallazgo que usa, no produce valores físicos nuevos y rechaza la inferencia física (regla 4).
15. Una vinculación hallazgo → secuencia/fotograma requiere una fuente documentada. Sin ella, la evidencia de imagen
    se muestra como *contexto ilustrativo*, nunca como medición del hallazgo (ver regla 5).
16. Comparar condiciones solo entre valores publicados y citados; las condiciones no reportadas quedan vacías,
    nunca estimadas.
17. La relevancia para la seguridad describe por qué un hallazgo importa para el diseño o la operación en vuelo
    tripulado según la fuente; nunca es una predicción de riesgo para un material, nave o misión concretos.

## Convenciones de código
- Identificadores y mensajes de commit en inglés; comentarios, docstrings y documentación en español; el texto de la UI
  pasa por el locale del frontend (`frontend/src/i18n.tsx`, `es` por defecto, `en` disponible).
- Python 3.11+, primero la biblioteca estándar; dependencias gestionadas con `uv`. Longitud de línea de Ruff: 110.
- Preferir el cambio más pequeño que funcione; ninguna dependencia nueva para lo que resuelven unas pocas líneas.
- Backend: agregar rutas dentro de `create_app`; devolver `envelope(...)`; 404 para IDs desconocidos.
- Frontend: clases utilitarias de Tailwind; piezas compartidas en `ui.tsx`; mantener los tipos de `api.ts` sincronizados con el backend.
- Toda lógica nueva incluye una prueba focalizada. Las pruebas del pipeline construyen inventarios sintéticos en `tmp_path`.
- Gráficos: una serie, un eje, unidades en las etiquetas, nunca dibujar a través de huecos.

## Flujo de Git
- Crear ramas desde `development`; abrir PRs hacia `development`. `main` solo recibe versiones revisadas.
- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`) para el trabajo habitual.
- Nunca versionar datos crudos (ver `.gitignore`), secretos ni archivos `.env`.
- No hacer push ni abrir PRs salvo que una persona lo pida.

## Dónde mirar primero
- Qué significa una columna → `docs/data-dictionary.md`
- Cómo se derivó un valor → `docs/data-lineage.md`
- Qué no podemos afirmar → `docs/scientific-limitations.md`
- Qué falta para ser findings-first → `docs/gap-analysis.md`
- Qué sigue (backlog y MVP) → `docs/implementation-plan.md`
