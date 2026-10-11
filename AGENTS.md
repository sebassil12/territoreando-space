# AGENTS.md

Instrucciones para agentes de código de IA (Claude Code, Codex, Copilot, …) que trabajan en este repositorio.
Es la **única fuente de verdad**: `CLAUDE.md` y `.github/copilot-instructions.md` solo apuntan aquí.

## 1. Misión

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

### Flujo de producto

```
Hallazgo (jerarquizado, criterio visible)
   → Confianza y relevancia para la seguridad (categorías documentadas + justificación)
   → Evidencia (fuente citada; secuencias / fotogramas / referencias vinculadas)
   → Comparación de condiciones (O2, flujo, presión, material, escala, según la fuente)
   → Interpretación por IA (etiquetada, basada solo en hallazgos citados)
```

Estado: el flujo está **planificado**. Hoy existe la capa de evidencia (catálogo, visor, referencias publicadas,
asistente determinista). Ver `docs/gap-analysis.md` y `docs/implementation-plan.md`.

## 2. Reglas científicas (no negociables)

### Evidencia
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

### Hallazgos (complementan, no reemplazan, las anteriores)
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

## 3. Arquitectura

Los datos fluyen en un solo sentido. Cada capa solo lee la capa a su izquierda.

```
descompressed/ (raw, read-only, git-ignored)
   │
   ▼
pipeline/  ── offline, CLI ──►  data/processed/*.csv                    (evidence layer, committed)
                                data/scientific_reference_results.json  (hand-transcribed, cited)
                                data/findings.json                      (planned: findings layer)
   │
   ▼
backend/   FastAPI, loads CSV/JSON into memory at startup ── /api/*
   │
   ▼
frontend/  React + TS + Vite + Tailwind v4, calls /api via Vite proxy
```

| Capa | Ruta | Responsabilidad | Notas |
|---|---|---|---|
| Evidencia | `pipeline/build_catalog.py` | inventario → catálogos de secuencias / fotogramas / calibración | funciones puras (`interval_stats`, `assign_roles`, `temporal_quality`) con pruebas unitarias |
| Evidencia | `pipeline/compute_metrics.py` | estadísticas de píxeles por fotograma → `frame_metrics.csv` | solo píxeles / intensidad de 8 bits |
| Hallazgos | `data/findings.json` | **planificado**: hallazgos transcritos a mano con cita (archivo + página) | ver `docs/implementation-plan.md` |
| API | `backend/app.py` | fábrica `create_app(processed, raw, references)` + rutas | toda respuesta JSON = `{data, source, warnings, quality}` |
| API | rutas `/api/findings*` | **planificado**: listado jerarquizado, detalle, evidencia, comparación | no existen aún |
| API | `backend/assistant.py` | preguntas y respuestas deterministas, basadas en fuentes | sin LLM; rechaza la inferencia física |
| UI | `frontend/src/App.tsx` | estructura, pestañas, resumen, catálogo, ciencia, asistente, limitaciones | enlaces directos por hash `#Viewer/<sequence_id>` |
| UI | `frontend/src/Viewer.tsx` | reproductor, procedencia, detalle del fotograma, gráfico de métricas (SVG simple) | el gráfico corta la línea en los huecos temporales |
| UI | `frontend/src/ui.tsx` | componentes de presentación reutilizables | sin llamadas a la API |
| UI | `frontend/src/i18n.tsx` | locale: diccionarios `es` / `en`, `I18nProvider`, `useT()` | `es` por defecto; todo texto visible pasa por `t('...')` |
| UI | `frontend/src/api.ts` | tipos + funciones de consulta | refleja aquí las formas del backend |
| Calidad | `tests/` | pytest: pipeline (datos sintéticos), API, asistente | las pruebas de la API usan los catálogos versionados |
| Docs | `docs/` | contexto, diccionario, linaje, limitaciones, brechas, demo, plan | actualizar cuando cambie el comportamiento |

Sin base de datos, sin colas, sin microservicios. Mantenerlo así salvo que aparezca una necesidad medida.

## 4. Clean code

Aplica a todo código nuevo o modificado. El código existente se ajusta cuando se toca, no en refactors masivos aparte.

### Idioma
- **Identificadores en inglés**: variables, funciones, clases, tipos, módulos, rutas, claves JSON, columnas CSV.
- Comentarios, docstrings y documentación en **español**. Mensajes de commit en **inglés** (Conventional Commits).
- Texto visible de la UI solo vía `t('...')` (`frontend/src/i18n.tsx`); nunca literales en JSX.

### Nombres
- Nombres que revelan intención: `sequence_id`, `median_interval_s`, `isGapDetected`; nada de `data2`, `tmp`, `x`.
- Unidades en el nombre cuando hay magnitud: `_s`, `_ms`, `_px`, `_mm_s`.
- Booleanos como pregunta: `is_*`, `has_*`, `can_*`. Funciones como verbo: `build_catalog`, `loadFindings`.
- Convención por lenguaje: Python `snake_case` / `PascalCase` para clases; TS `camelCase` / `PascalCase` para
  componentes y tipos; constantes `UPPER_SNAKE_CASE`.

### Tamaño y forma
- **Funciones ≤ 30 líneas** (sin contar docstring) y **≤ 4 parámetros**; más allá, extraer funciones o agrupar
  parámetros en un `dataclass` / tipo.
- **Componentes React ≤ 150 líneas**; extraer subcomponentes o hooks cuando se superen.
- **Archivos ≤ 300 líneas**; al superarlos, dividir por responsabilidad.
- Máximo 3 niveles de anidación; usar retornos tempranos (*guard clauses*).
- Una función hace una sola cosa: o calcula, o hace I/O, o formatea. Lógica pura separada de I/O para poder probarla.
- Sin números mágicos: constantes con nombre (`GAP_FACTOR = 2`).
- Excepciones a estos límites se justifican con un comentario en el código, no en silencio.
- Ruff los verifica en Python (`pyproject.toml`): `C901` complejidad ≤ 10, `PLR0913` ≤ 4 parámetros,
  `PLR0915` ≤ 30 sentencias. La deuda previa está marcada con `# noqa` y se refactoriza al tocarla.

### Reutilización
- **Clases y componentes reutilizables** para conceptos con identidad propia: `dataclass(frozen=True)` en Python
  para registros del dominio (p. ej. `Finding`, `Citation`), tipos en `api.ts` y componentes de presentación en
  `ui.tsx` (p. ej. `Badge`, `Card`, `SourceCitation`).
- Extraer a pieza compartida cuando un patrón aparece **por segunda vez**; no antes (sin abstracciones especulativas,
  sin interfaces con una sola implementación, sin fábricas para un solo producto).
- Componentes contenedor (datos, estado, llamadas a la API) separados de componentes presentacionales (solo props).
- Reutilizar antes de escribir: buscar en `ui.tsx`, `api.ts`, `pipeline/` y `backend/` antes de crear algo nuevo.

### Stack
- Python 3.11+, primero la biblioteca estándar; dependencias con `uv`. Ruff, longitud de línea 110.
- Ninguna dependencia nueva para lo que resuelven unas pocas líneas.
- Backend: rutas dentro de `create_app`; devolver `envelope(...)`; 404 para IDs desconocidos.
- Frontend: utilidades de Tailwind; tipos de `api.ts` sincronizados con el backend.
- Gráficos: una serie, un eje, unidades en las etiquetas, nunca dibujar a través de huecos.

### Pruebas
- Toda lógica nueva incluye una prueba focalizada que falla si la lógica se rompe.
- Las pruebas del pipeline construyen inventarios sintéticos en `tmp_path`; las de la API usan los catálogos versionados.
- Todo hallazgo nuevo en `data/findings.json` debe pasar la validación de citas (cuando exista, ver backlog P0-2).

## 5. Comandos

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

### Definición de terminado
1. Los tres checks pasan.
2. Las reglas científicas (sección 2) y de clean code (sección 4) se cumplen.
3. La documentación de `docs/` refleja el cambio de comportamiento.
4. Ninguna afirmación nueva sin cita; ningún texto de UI fuera de `i18n.tsx`.

## 6. Flujo de Git
- Crear ramas desde `development`; abrir PRs hacia `development`. `main` solo recibe versiones revisadas.
- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`) en inglés.
- Nunca versionar datos crudos (ver `.gitignore`), secretos ni archivos `.env`.
- No hacer push ni abrir PRs salvo que una persona lo pida.

## 7. Dónde mirar primero
- Qué significa una columna → `docs/data-dictionary.md`
- Cómo se derivó un valor → `docs/data-lineage.md`
- Qué no podemos afirmar → `docs/scientific-limitations.md`
- Qué falta para ser findings-first → `docs/gap-analysis.md`
- Qué sigue (backlog y MVP) → `docs/implementation-plan.md`
