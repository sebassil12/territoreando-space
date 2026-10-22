# Experiencia guiada para público no experto

## Objetivo
Convertir el dashboard en un recorrido comprensible para alguien sin formación en combustión: contexto,
evidencia visual, comparación y conclusiones, con interacción significativa y sin perder la trazabilidad.

## Problema
La app expone datos y alcances, pero no los explica. Hallazgos del análisis (rama `development`, 2026-10-21):
- 8 pestañas al mismo nivel, sin orden sugerido; la portada (`SafetyOverview.tsx`) es una lista de citas.
- Las advertencias pesan más que el contenido (banners en Twin, Evidence, Overview y una pestaña Limitations).
- Jerga sin explicar: `eta_g`, `R0`, `Vf`, `l_p`, "discriminant", IDs de secuencia, enums crudos, JSON crudo
  en `PlaybackPanel.tsx:47`.
- Cero gráficos pese a ~68,8k filas en `data/processed/frame_metrics.csv`.
- El modo Model exige `eta_g`/`R0` adimensionales; oxígeno, flujo y material no entran al cálculo
  (`ScenarioResults.tsx:41`); 2 de 3 modelos con `implemented=False` (`backend/scenario_registry.py:39,57`).
- Textos del Twin solo en inglés (`i18n.guided.ts`, `i18n.playback.ts`, `i18n.replay.ts`); `' · BLOCKED'`
  fijo en `SaffirePlayback.tsx:28`.
- Contradicción: Overview dice "no es un digital twin" (`i18n.es.ts:12`) y existe la pestaña "Digital Twin".

## Por qué
Un jurado o usuario no experto debe entender en menos de un minuto qué es SAFFIRE, qué se observó y qué puede
explorar. La rigurosidad actual es un activo solo si se puede leer.

## Alcance
- Frontend: navegación, portada narrativa, glosario, gráficos, i18n del Twin, constructor por variables intuitivas.
- Backend: solo lectura/agregación de datos existentes (sin nuevos modelos físicos).
- Fuera de alcance: simulación nueva, CFD, calibración física de imágenes, LLM.

## Restricciones
- Toda cifra mostrada mantiene su cita (archivo + página/tabla).
- Ninguna afirmación nueva fuera de `docs/scientific-limitations.md`.
- Las limitaciones se conservan, pero se muestran en contexto (tooltip/"¿qué no sabemos?") en vez de banners.
- Reglas de `AGENTS.md` y ruff (complejidad, argumentos, sentencias) siguen vigentes.

## Estrategia de entrega
- Pronóstico: ~1.800–2.400 líneas creadas/modificadas (supera 400). Estrategia `ask-on-risk`: antes del primer
  commit que supere el presupuesto se pregunta `stacked-to-main` o `feature-branch-chain`.
- Rama de feature: `feat/guided-experience` desde `development`. `main` no se toca.

## Tareas
Ruta por tarea: D = delegada (2+ archivos no triviales), I = inline.

- [x] T0 (D, prioridad 1, pedido 2026-10-21) Onboarding + Fundamentos. Absorbe T3 y la parte conceptual de T2.
      Pantalla `Onboarding` como ruta por defecto, en pasos: el problema (fuego en naves) → por qué la
      microgravedad cambia el fuego → el experimento SAFFIRE-II → qué datos hay (conteos en vivo desde la API) →
      qué aprendimos (hallazgos citados) → qué no sabemos → por dónde explorar. Pantalla `Fundamentos` para un
      ingeniero de software sin formación aeroespacial: conceptos previos, cada uno con explicación llana,
      analogía de software cuando ayude, dónde aparece en los datos y cita o marca "conocimiento general".
      Check: test de paridad es/en de claves, test de que cada concepto enlaza a una pantalla existente,
      `npm test`, `npm run lint`, `npm run build`.

- [ ] T1 (D) i18n del Twin: traducir `i18n.guided.ts`, `i18n.playback.ts`, `i18n.replay.ts` a es/en; quitar
      `' · BLOCKED'` fijo; mapear enums de calidad/rol a etiquetas legibles; ocultar JSON crudo tras "Detalles técnicos".
      Check: tests de contrato i18n (claves es/en iguales) + `frontend/tests/*` verdes.
- [ ] T2 (D) Glosario: archivo de términos (es/en) con definición llana + cita; componente `Term` con tooltip
      accesible (teclado + `aria-describedby`) aplicado a `eta_g`, `R0`, `Vf`, `l_p`, flujo opuesto/concurrente,
      pirólisis, longitud límite. Check: test que cada término usado en UI exista en el glosario.
- [ ] T3 (D) Portada narrativa "Recorrido": 4 pasos (¿Qué es SAFFIRE? → Ver el fuego real → Comparar muestras →
      Qué aprendimos), cada paso enlaza a la pantalla existente con contexto precargado. Navegación agrupada:
      "Recorrido" + "Explorar" (resto de pestañas). Renombrar "Digital Twin" a "Reconstrucción 3D" para eliminar la
      contradicción. Check: test de rutas hash + revisión visual.
- [ ] T4 (D) Gráfico de avance de la llama: serie temporal de métricas por secuencia (intensidad/área en píxeles)
      desde `/api/metrics`, sincronizada con el frame del Viewer (cursor = frame actual). Unidades explícitas
      "píxeles / intensidad 8-bit, sin calibrar". Check: test del agregador backend + test de sincronía cursor/frame.
- [ ] T5 (D) Constructor por variables intuitivas: el usuario elige material, flujo y oxígeno; la app muestra las
      muestras reales que coinciden (`sample_conditions.csv`), sus hallazgos y secuencias, e indica qué combinación no
      tiene evidencia. El modo `eta_g`/`R0` queda como "Modo experto". Check: tests de coincidencia y de caso vacío.
- [ ] T6 (D) Playback comparado: dos casos lado a lado con la misma escala temporal y velocidad de frente.
      Check: test de escala compartida.
- [ ] T7 (D) Bugs: modo del Twin en el hash (`Twin.tsx:9-14`); opciones vacías y estados de carga/error en Evidence
      (`Evidence.tsx:217-242`); errores silenciosos en Limitations (`Limitations.tsx:34-62`); `setState` en render
      (`App.tsx:41`); retirar `/api/twin/models` y `/api/twin/evaluate` si siguen sin uso (`backend/app.py:194-199`).
      Check: test por cada bug (RED antes de corregir).
- [ ] T8 (D, condicionada) Modelos 3D de hardware con Blender → glTF: probeta con dimensiones reales
      (`sample_conditions.csv`, p. ej. 5 x 29 cm) y ducto de flujo. Bloqueada hasta (a) instalar y autorizar Blender MCP
      y (b) contar con fuente citada de dimensiones del ducto/soporte. Sin fuente: no se modela el ducto.

## Criterios de aceptación
- Un usuario nuevo llega desde la portada a ver frames reales y un gráfico en ≤ 3 clics.
- Ningún término técnico visible sin definición accesible.
- UI 100 % en el idioma seleccionado (salvo citas y datos de origen).
- Toda cifra conserva su cita; tests backend y frontend verdes; ruff y oxlint sin errores.

## Progreso
- 2026-10-21: documento creado a partir del análisis de UX. Sin tareas iniciadas. Sin commits.
- 2026-10-21: T0 completada (ruta D: escritor delegado, 2+ archivos no triviales). Pantalla `Onboarding` como ruta por
  defecto (`#Onboarding/<1-7>`, pasos por hash, navegable con teclado), pantalla `Fundamentals` (13 conceptos, 4 fases
  de estudio, cada uno con enlace a pantalla existente y cita o marca "Conocimiento general"), pestaña Twin renombrada a
  "Reconstrucción 3D" / "3D reconstruction" (ruta `Twin` sin cambios). Copia es/en en `i18n.onboarding.ts` y
  `onboarding/fundamentalsMessages.ts`. RED observado (módulos inexistentes) antes de implementar.
  Evidencia: `npm test` 23/23; `npm run lint` 0 warnings/0 errors; `npm run build` OK (aviso de chunk >500 kB previo);
  `uv run pytest -q tests` 217 passed, 1 skipped (imágenes raw ausentes); `ruff check` OK. Revisión visual en Chrome:
  conteos en vivo 24/21/9 y fallback de imagen sin raw. Commit: `2f6cf3e`.

## Siguiente paso
Confirmar orden de prioridad (sugerido: T1 → T7 → T3 → T2 → T4 → T5 → T6 → T8) y crear `feat/guided-experience`.
