# Plan de implementación y estado

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

## Próximas tareas (en orden)
1. Validar píxel→mm para una secuencia usando su rejilla de 30 mm (medir el tamaño del bloque, comprobar la distorsión,
   documentar y solo entonces cambiar `calibration_status` a `validated` para esa secuencia).
2. Detección de fotogramas con LED (iluminación verde periódica) para separar fotogramas iluminados y oscuros antes de
   graficar métricas.
3. Enmascarar la banda de texto incrustada en los TIFF antes de calcular métricas.
4. Capa LLM opcional sobre el asistente determinista, restringida a la misma evidencia y formato de salida.
5. Incorporar la lista oficial de entregables del reto cuando se publique (28 de octubre de 2026).
