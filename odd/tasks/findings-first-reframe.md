# Reencuadre findings-first (misión, alcance, backlog, MVP)

## Objetivo
Alinear el proyecto con el reto *Flame in Freefall* (NASA Space Apps 2026): dashboard interactivo con IA que resume,
jerarquiza e interpreta hallazgos de combustión en microgravedad para entregar insights de seguridad contra incendios
en vuelos espaciales tripulados.

## Problema
La documentación enmarca el producto como explorador de evidencia (imágenes/archivos de SAFFIRE-II). La unidad primaria
debe ser el **hallazgo científico**; imágenes y secuencias son evidencia de respaldo.

## Alcance (solo documentación, sin implementar el dashboard)
- Actualizar misión, alcance, flujo de producto, reglas científicas, limitaciones y backlog en `AGENTS.md`, `README.md`, `docs/`.
- Declarar explícitamente lo que el producto NO es: simulador CFD, predictor universal de riesgo, gemelo digital,
  sistema de seguridad certificado, app centrada en galería de imágenes.
- Análisis de brechas (estado actual vs. findings-first), backlog priorizado y definición del primer MVP findings-first.
- Preservar trabajo útil: normalización de datos, metadatos de secuencias, calidad temporal, inventario de calibración,
  evidencia de imagen.

## Tareas
- [x] T1 — Docs: misión/alcance/flujo/reglas/limitaciones + `docs/gap-analysis.md` + backlog y MVP en
  `docs/implementation-plan.md` (ruta: delegada, >2 archivos no triviales)

## Checks
Revisión estructural (doc pasiva). `uv run pytest -q` sin cambios de código esperados.

## Progreso
- T1: archivos modificados — `AGENTS.md` (Misión + "Qué NO es", Flujo de producto, reglas 11–17, filas
  "planificado" en la tabla de arquitectura), `README.md`, `docs/project-context.md`,
  `docs/scientific-limitations.md` (límites de hallazgos/confianza/ranking/IA), `docs/gap-analysis.md` (nuevo),
  `docs/implementation-plan.md` (historial + MVP + backlog P0/P1/P2 + decisiones), `docs/demo-script.md` (marcado
  como demo del estado actual). Sin cambios en código, datos ni pruebas.
- Verificación: lectura estructural de cada archivo; `uv run pytest -q` → 31 passed.
- Hallazgo de la exploración: el filtro `FORBIDDEN` de `backend/assistant.py` rechaza "risk" y "mm/cm", lo que
  bloquearía preguntas legítimas sobre relevancia citada y valores publicados (backlog P1-3).

## Decisiones abiertas (requieren a la persona usuaria)
- D1 — Interpretación por IA: LLM restringido vs. asistente determinista extendido.
- D2 — Aprobar categorías y criterios de confianza / relevancia para la seguridad propuestos.
- D3 — Fuente para un mapeo documentado carpeta→muestra (sin ella, la evidencia de imagen es ilustrativa).
- D4 — Alcance de transcripción del MVP (semilla desde `scientific_reference_results.json` vs. lectura completa de urban2019).

## Siguiente paso
Resolver D2 y D4; luego P0-1 y P0-2 (esquema + `data/findings.json`).
