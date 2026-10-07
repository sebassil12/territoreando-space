# territoreando-space — Flame in Freefall

**Explorador de evidencia SAFFIRE-II** para el reto del NASA Space Apps Challenge 2026
*Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data*.

## De qué trata
Un dashboard visual sobre los datos de combustión en microgravedad del experimento Saffire-II de la NASA (realizado a
bordo de Cygnus, misión CRS OA-5). Permite a cualquier persona —estudiantes, desarrolladores, personas sin formación
aeroespacial— recorrer las secuencias de imágenes publicadas, comprobar si cada una es temporalmente continua,
reproducirlas fotograma a fotograma con trazabilidad completa (secuencia, fotograma, `raw_id`, tiempo, archivo
fuente), graficar estadísticas simples de píxeles y consultar, junto a ellas, los resultados científicos publicados.

> Dashboard de exploración de evidencia. No es un simulador CFD, no es un predictor de riesgo de incendio y no es un
> gemelo digital.

## Qué considerar antes de contribuir
1. **Los datos crudos no están en Git.** Las imágenes, archivos comprimidos, inventario y artículo de SAFFIRE-II
   (~2,4 GB) están excluidos por `.gitignore`. Solicite `SAFIRE-II Project.zip` a los responsables del proyecto
   (almacenamiento compartido del equipo) y descomprímalo en la raíz del repositorio para que exista `./descompressed/`.
   Los catálogos generados en `data/processed/` *sí* están versionados, por lo que las vistas de catálogo funcionan
   sin las imágenes.
2. **La honestidad científica es parte del producto.** Nunca mostrar temperatura, tasa de liberación de calor,
   oxígeno, riesgo de incendio ni longitudes en mm/cm derivadas de píxeles. Nunca asignar una etiqueta de carpeta
   (S1…S9, F1, F2) a un número de muestra o material de Saffire-2. Toda afirmación científica requiere una fuente
   (archivo + página). Ver [docs/scientific-limitations.md](docs/scientific-limitations.md).
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
data/processed/       catálogos y métricas generados (CSV)
data/scientific_reference_results.json   valores transcritos de urban2019.pdf (con páginas)
backend/              aplicación FastAPI + asistente determinista
frontend/             React + TypeScript + Vite + Tailwind
tests/                suite de pytest
docs/                 contexto, diccionario de datos, linaje, limitaciones, guion de demo, plan
AGENTS.md             arquitectura + reglas para agentes de IA (CLAUDE.md lo importa)
```

## Requisitos
Python 3.11+ con [uv](https://docs.astral.sh/uv/), Node 20+.

## Rutas de datos
Los datos crudos se esperan en `./descompressed/` (descomprima `SAFIRE-II Project.zip` en la raíz del proyecto; ya
contiene esa carpeta). Para la API se puede cambiar con `SAFFIRE_RAW_DIR=/ruta/a/descompressed`. Las imágenes
faltantes no provocan errores: los fotogramas se marcan como `missing` / `path_only` y la interfaz muestra una
advertencia.

## Generar los datos (≈15 s)
```bash
uv sync
uv run python -m pipeline.build_catalog --raw descompressed     # 21 secuencias, 69.380 fotogramas
uv run python -m pipeline.compute_metrics --raw descompressed   # 1 de cada 5 fotogramas (+ posteriores a huecos y el último)
```

## Ejecutar
```bash
uv run uvicorn backend.app:app --port 8000          # API → http://localhost:8000/docs
cd frontend && npm install && npm run dev           # UI  → http://localhost:5173
```
Enlace directo: `http://localhost:5173/#Viewer/S1-C2-raw-jpeg-part1`.

## Pruebas y lint
```bash
uv run pytest -q
uv run ruff check pipeline backend tests
cd frontend && npm run lint && npm run build
```

## API
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
| `POST /api/assistant` | `{question, sequence_id?}` → Observation / Interpretation / Evidence / Limitations |

## Limitaciones de los datos (resumen)
- `raw_id` se interpreta como milisegundos (inferido del espaciado de ~33 ms y de las cámaras a 30 fps, urban2019 p.173).
- S1…S9 / F1 / F2 / C1 / C2 son etiquetas de carpeta, no números de muestra ni identidades de cámara comprobados.
- Las series Mapped TIFF tienen huecos de hasta 183 s → no aptas para calcular tasas.
- Las variantes Raw / Mapped / ICMAD de la misma ventana son secuencias separadas y nunca se combinan.
- La calibración está `pending`: todas las medidas están en píxeles.
- Los destellos del LED verde y la banda de texto de los TIFF afectan las métricas de píxeles.

Lista completa: [docs/scientific-limitations.md](docs/scientific-limitations.md). Demo: [docs/demo-script.md](docs/demo-script.md).
