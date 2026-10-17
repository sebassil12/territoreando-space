# Guion de demo (≈5 min)

Inicie ambos servidores (README → Ejecutar) y abra http://localhost:5173. La interfaz está en español por defecto
(botón `EN` para inglés). El texto de los hallazgos se muestra tal como está en `data/processed/findings.json`.

1. **Resumen de seguridad** (inicio) — "¿Por qué una llama se comporta distinto en microgravedad?" Cada afirmación es
   un hallazgo con ID y ubicación: flujo de 20–25 cm/s típico de una nave (`F-urban2019-008`, p.168), estado
   cuasi-estacionario con flujo forzado (`F-urban2019-007`, p.181), tamaño máximo de llama y calor liberado
   (`F-urban2019-006`, p.168). Señale "Lo que sabemos (con fuente)" frente a "Lo que falta" (notas de calidad de
   datos parciales, en conflicto o desconocidas).
2. **Hallazgos** — filtre `tipo de evidencia = Nota de calidad de datos`. Abra `F-data-004` con **Ver evidencia →**:
   las dos secuencias TIFF aparecen con insignia *hueco detectado* e *incompleta* y sus advertencias. Haga clic en
   una para abrirla en el visor (`#Viewer/<id>`).
3. **Priorizados** — lea el aviso: la prioridad es un orden de lectura por reglas, no una probabilidad de incendio ni un
   nivel de riesgo certificado. Muestre los criterios, el orden de desempate y el desglose del puntaje del primer
   hallazgo (`F-urban2019-002`: relevancia alta +3, confianza alta +3, resultado publicado +2, completo 0).
4. **Comparación** — seleccione S5, S6 y S9. Aparece **Comparación limitada**: material y espesor difieren, O₂ y
   presión faltan, y el flujo de S6 muestra ambos valores citados (DoD 30 · urban2019 25). No se extrae conclusión.
5. **Evidencia** — catálogo de secuencias como evidencia de apoyo, con aviso de cobertura parcial. Abra
   `S1-C2-raw-jpeg-part1` (continua, 5000 fotogramas, 166,6 s); reproduzca y pause; muestre la procedencia y el
   gráfico de intensidad media con los picos del LED verde (urban2019 p.173, `F-urban2019-015`).
6. **Asistente** — pulse "¿Hay conflicto en el flujo de la muestra 6?": la respuesta cita `F-data-001` con archivo y
   ubicación y separa Observación, Interpretación (IA, determinista, sin LLM), Evidencia y Limitaciones. Luego pulse
   "¿Cuál fue la humedad relativa?" → **No se puede determinar con los datos cargados**. Por último, "¿Cuál es la
   temperatura de la llama?" → pregunta rechazada con el motivo.
7. **Limitaciones** — sin datos de sensores como números, cobertura parcial, píxeles sin calibrar, conflicto de S6,
   sin predicciones.

Frase de cierre: "Cada afirmación del dashboard se puede rastrear hasta un archivo y una página; lo que no está en las
fuentes, no se afirma."

## Scenario Builder

Open **Digital Twin** (`#Twin`), independently of observation playback. Select
**Explore a mathematical model** for this walkthrough.

1. Choose **Explore a dimensionless balance**. Read the declared opposed flow,
   microgravity, thermally thin and steady-balance assumptions, then click
   **Use this hypothetical setup**. This explicitly accepts those conditions.
2. Only two numeric inputs appear. Read their plain-language definitions and units.
   For a synthetic arithmetic check, manually enter `eta_g = 0` and
   `radiation_number = 0`; these are not scientific presets or reference values.
3. Click **Calculate my scenario**. Compatibility is checked before evaluation.
   Expect `eta_f = 1`, `positive_branch` and `modelled_unvalidated` with the cited
   source. Open **Scientific details** for discriminant `1`, warnings and provenance.
4. Orbit/zoom the 3D camera or turn the sample display. The fixed purple flame is
   an illustration; cyan arrows express declared direction, and the white arrow
   defines a reference. None represents calculated motion, temperature or dimensions.
5. Edit either parameter: the previous result disappears. Set `eta_g = 0` and
   `radiation_number = 1` to inspect `no_real_branch`; the illustration stays the
   same and makes no extinction claim. Advanced conditions can test an incompatible
   flow, which the engine must refuse.
6. Click **Change model**, then **Explore requirements** for Urban or 2016. Read
   the missing inputs and evidence. Neither offers a calculation button; full
   engine reasons remain in Scientific details. WebGL failure leaves these controls
   and mathematical evaluation available.

**IMPLEMENTED:** guided editor, schematic 3D and mathematical evaluation.
**BLOCKED:** research evaluators. **PENDING:** predictive transient 3D.
**VALIDATED:** no experimental model. See [3D classification](digital-twin-3d.md).

## SAFFIRE evidence playback

1. Open **Digital Twin** and **SAFFIRE evidence playback**. Choose a case explicitly.
2. Inspect Published reference Vf/lp, file/page, quality and inherited-transcription warning.
3. Play, pause and scrub: front/base boundaries move; the flame support stays constant
   for steady lp, and the dark traversed-region proxy grows. None is measured video.
4. Reset, switch case and compare local motion on the common longitudinal display
   scale. Switching case starts at local zero and pauses.
5. Expand **Scientific details**. Show the local origins, two
   derived anchors, formula and warnings; no CFD or physical model validation.
6. Return to mathematical exploration: the original two-input evaluator remains
   independent and its schematic flame does not react to numeric outputs.

See [playback classifications](saffire-playback.md#interaction-and-visual-mapping).

### Procedural appearance walkthrough

The former purple playback prism is replaced by volumetric, physically inspired
fire. Play and orbit to see the material, active zone and residue. Compare 0.25x
and 2x: timeline speed changes while published Vf stays fixed. Pause freezes noise
and front motion; reset/seek reproduces the same appearance at the same time.
Open **Scientific details** for classifications, source-review warning and complete
provenance. Do not describe procedural color as temperature, char as measured mass
loss or visual fluctuations as experimental turbulence.

## NASA Evidence Replay

1. Open Digital Twin → NASA Evidence Replay; select SAFFIRE-2 Sample 5.
2. Select mapped JPEG, ICMAD PNG or mapped TIFF independently. Inspect filenames,
   timestamps and the TIFF gap warning. Missing local files show a limitation;
   configuring `SAFFIRE_RAW_DIR` restores source-image access through the API.
3. Compare the evidence panel with the schematic 3D on the right. Explain why the
   image index is independent and no flame animation or fidelity score is shown.
4. Inspect inherited Vf/lp citations and source-checked sample geometry. Neither
   establishes camera calibration or verifies a measured reconstruction.
5. Select SAFFIRE-1/3 to show the absence of matching local image sequences.
   Return to existing playback or mathematical exploration to demonstrate that
   both retain their separate behavior and limitations.

Full [audit, source citations and contract](nasa-evidence-replay.md).
