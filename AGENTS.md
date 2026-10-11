# AGENTS.md

Instrucciones para agentes de código de IA (Claude Code, Codex) que trabajan en este repositorio.
Para personas: esta es también la descripción precisa más breve del sistema.

## Misión

Construir un dashboard interactivo con IA que resuma, rankee e interprete hallazgos de combustión en microgravedad a partir de los datos y la investigación de SAFFIRE-II / PSI-99 de la NASA, para el reto *Flame in Freefall* de NASA Space Apps 2026.

El objetivo es convertir evidencia científica dispersa en insights claros, jerarquizados y trazables sobre seguridad contra incendios en vuelos espaciales tripulados.

Las imágenes, secuencias y archivos son evidencia de respaldo; el producto central son los hallazgos, su relevancia, su confiabilidad y su interpretación.

El dashboard no es un visor de imágenes, un simulador CFD ni un predictor universal de incendios. Cada afirmación debe citar su fuente y distinguir entre resultado publicado, dato observado, métrica derivada, interpretación por IA y limitación.

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
| `docs/` | contexto, diccionario de datos, linaje, limitaciones, demo, plan | actualizar cuando cambie el comportamiento |

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
- Qué sigue → `docs/implementation-plan.md`
