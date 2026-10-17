# Limitaciones científicas

Lo que el dashboard **no puede** concluir, y por qué. El producto no es un simulador CFD, ni un predictor universal de
riesgo de incendio, ni un gemelo digital, ni un sistema de seguridad certificado, ni una galería de imágenes.

| Afirmación | Estado | Motivo |
|---|---|---|
| Temperatura de la llama, tasa de liberación de calor | No disponible | Las imágenes no tienen calibración radiométrica. Brillo ≠ temperatura. |
| Riesgo de incendio de un material o una nave | No disponible | Los resultados publicados se aplican solo a sus condiciones de ensayo (urban2019 §6, hallazgo 6). |
| Concentración de oxígeno a partir de imágenes | No disponible | Las condiciones de ensayo provienen solo del artículo. |
| Qué muestra contiene una carpeta | Documentado | `SAFFIRE-II DoD.docx` Tabla 2: S1…S9 → muestras 1–9, F1/F2 → pre-flow/post-flow. Vínculo carpeta→registro PSI por etiqueta compartida. |
| Material y condiciones por muestra | Documentado, confianza media | DoD Tabla 1 es una imagen (transcripción visual); urban2019 confirma las muestras 5, 6 y 9. Ver `data/processed/sample_conditions.csv`. |
| Flujo de la muestra 6 | En conflicto | urban2019 p.173: 25 cm/s; DoD Tabla 1: 30 cm/s. Se muestran ambos valores; no se compara la muestra 6 por flujo. |
| C1 / C2 = cámara 1 / cámara 2 | Documentado | DoD, texto tras la Figura 1; Nomenclature PDF p.1 ("Cn" = número de cámara). |
| Material a partir de píxeles | Nunca | El material viene solo de documentos citados (regla 4). |
| Longitudes en mm / cm, tasas de propagación | No disponible | Existen rejillas de distorsión (bloque de 30 mm), pero ningún mapeo píxel→mm está validado. |
| Tasas a partir de series Mapped TIFF | No apto | Huecos de hasta 183 s; intervalo mediano de 167 ms (no 33 ms). |
| Significado de "BIT", "ICMAD", grupos "F" | Documentado | DoD Tabla 4 (BIT = Built-In Test, no son quemas; ICMAD = anotación de exposición/ganancia); DoD tras la Figura 1 (F1/F2). |
| Cobertura temporal de las quemas | Parcial | Solo ≈28,8 % de los JPEG recibidos está en local (manifiesto xlsx); S9 local cubre ≈167 s de 900 s. |
| Sensor data (O2, CO2, pressure, temperatures) | Recovered offline for Sample 5; not loaded into runtime catalogs | Complete workbook extracted to local CSV with source rows and units; see the [validation audit](saffire2-validation-audit.md). Sensor spatial assignments and response delays still require documentation. |

## Artefactos conocidos que afectan las métricas de píxeles
- **Iluminación con LED verde** durante 0,4 s cada 2 s (urban2019 p.173) ilumina toda la muestra; los picos de brillo
  suelen ser iluminación, no llama.
- **Banda de texto incrustada** en los fotogramas TIFF (nombre de archivo, contador de adquisición, exposición,
  ganancia) agrega píxeles brillantes.
- **Variantes de procesamiento** (raw / mapped / ICMAD) tienen distinta geometría y contraste; sus métricas no son
  comparables.
- **Umbral fijo (128)** es una heurística, no ajustada por secuencia.
- **Muestreo** de uno de cada 5 fotogramas (~6 fps para datos de 30 fps) puede producir aliasing con el ciclo de 2 s
  del LED.

## Límites de la capa de hallazgos

| Elemento | Qué significa | Qué **no** significa |
|---|---|---|
| Hallazgo | Afirmación transcrita o parafraseada fielmente de una fuente cargada, con archivo + página | Una conclusión propia del equipo ni un resultado calculado por el dashboard |
| Confianza | Categoría documentada sobre el respaldo que la *fuente* da a la afirmación (p. ej. medida directa vs. modelado vs. observación cualitativa), con justificación | Una probabilidad, un intervalo estadístico ni una puntuación numérica |
| Relevancia para la seguridad | Categoría documentada sobre por qué la afirmación importa para el diseño u operación en vuelo tripulado, según la fuente | Una evaluación de riesgo de un material, nave o misión concretos |
| Ranking | Orden determinista por criterios publicados en la UI/API (categorías + desempate) | Un juicio de importancia absoluta ni un resultado de aprendizaje automático opaco |
| Comparación de condiciones | Tabla lado a lado de condiciones publicadas (O2, flujo, presión, material, escala) | Una interpolación, extrapolación ni una tendencia ajustada entre ensayos |
| Interpretación (IA) | Resumen o explicación etiquetada, basada solo en hallazgos citados y cargados | Una fuente nueva, un valor físico nuevo ni una recomendación operativa certificada |
| Evidencia de imagen | Contexto visual; vinculación a un hallazgo solo con el mapeo del DoD (misma muestra) | Una medición del hallazgo: el dashboard no reproduce valores publicados desde píxeles |

Limitaciones concretas conocidas:
- **Un solo artículo científico cargado** (`urban2019.pdf`). El DoD y los demás documentos de `descompressed/` aportan
  procedencia y condiciones, no resultados; la confianza no puede apoyarse en replicación independiente.
- **Generalización limitada.** Los resultados aplican solo a sus condiciones de ensayo (urban2019 §6, hallazgo 6):
  muestras pequeñas, flujo forzado concurrente, O2 y presión reportados. Saffire-1 y Saffire-3 son otros vuelos y
  escalas (contexto, no imágenes en este conjunto de datos).
- **Vínculo imagen→muestra documentado, no medición.** El DoD permite enlazar secuencias de la misma muestra
  (`related_sequences`), pero los fotogramas locales son evidencia ilustrativa: no hay calibración ni instante de
  ignición para reproducir los valores publicados.
- **Criterios de confianza y relevancia (`docs/data-dictionary.md`) aún no validados por un experto.** Son propuestas documentadas; deben
  revisarse antes de presentarse como algo más que una ayuda de lectura.
- **La interpretación por IA puede equivocarse.** Debe mostrar los IDs de hallazgo que usa y permitir verificar cada
  afirmación contra la fuente; si no hay hallazgos que la respalden, responde "Not available in the loaded sources".
- **El asistente distingue relevancia citada de predicción de riesgo** (`backend/assistant.py`): responde sobre la
  relevancia para la seguridad y los valores publicados en mm/s citando hallazgos; sigue rechazando temperatura,
  predicción de riesgo y oxígeno, material o longitudes inferidos de imágenes. Es por patrones: puede fallar en
  preguntas ambiguas y entonces responde "Not available in the loaded sources".

## Valores de referencia publicados
Se muestran en la vista *Contexto científico*, etiquetados como *Referencia publicada*, con números de página. El
dashboard **no** los calcula y no están vinculados a ninguna secuencia de imágenes.

## Dimensionless model status

The backend implements the thermally thin, plus-root branch of Bhattacharjee et al.,
`20040053557.pdf`, Eq. (5), p.202; definitions are in Eq. (2), p.201.
See [equation, assumptions and API contract](dimensionless-model.md).

The equation was verified against the NASA PDF. **The implementation is not experimentally validated**
and is not calibrated to a SAFFIRE sequence. Its scope is a steady 0D opposed-flow calculation;
the frontend presents mathematical results and an interactive schematic 3D only.
Dimensional speed and transient 1D evolution are not implemented.
The exposed non-negative input domain is mathematical, not an empirically validated operating range.
Positive, zero, negative and non-real branches are not physical diagnoses of burning or extinction.
The API supplies no material properties, temperatures, heat release or risk.

Successful model responses have `quality="modelled_unvalidated"`; published references retain
`quality="published_reference"`. Synthetic numerical/API tests verify software behavior only.

## Bhattacharjee 2016 research outcome

Bhattacharjee et al. (2016), doi:10.1016/j.combustflame.2015.10.023, was investigated
separately from the implemented 2003 dimensionless branch. The critical opposed-flow
velocity equation is verified in its NASA republication, `TM-20210011385.pdf`, Eq. (2.5),
printed p.28 (derivation on pp.26–27). Several documented parameters were located,
including vaporization temperature and numerical-model flame temperature (p.28),
fuel thicknesses and oxygen conditions (pp.20–21).

The investigation could not reproduce the published theoretical critical velocities
of 7.5 and 10 mm/s with complete parameter traceability. The corresponding **Published reference** values
are in Table 2.1, p.28; they are extinction flow velocities, not flame spread rates.
Equation verification and the authors' comparisons do not establish experimental
validation by this project. **This model must not be presented as experimentally
validated by our project.**

The 2016 model is not implemented. It may remain a future parametric evaluator,
with explicit user-supplied inputs, no presets and no assumed values. Missing
parameters must remain missing; they must not be fitted to reproduce the references.
See [sources](sources.md#bhattacharjee-2016-investigation) and
[implementation status](implementation-plan.md#bhattacharjee-2016-decision).

## Urban 2019 reproducibility audit

The [Sample 5 audit](urban-reproducibility-audit.md) found no complete, traceable
input set for an absolute spread-rate calculation. Eq. (2) is verified in the
publisher's accessible HTML; its printed PDF page is not independently verified
in this checkout. The microgravity scaling relation, Eq. (6), is a proportionality,
not a formula with a documented numerical prefactor. The published pyrolysis
length is an observed input for the analytical calculation, not a predicted result.

No absolute speed or numerical error can be reported while the required thermal
inputs remain unresolved. No values were assumed or fitted, and no Urban model
was implemented. This finding concerns the sources audited, not a proof that
reproduction is impossible with additional experimental records.

## Scenario Engine claim boundaries
The implemented [Scenario Engine](scenario-engine.md) retains these claim boundaries.
Its applicability decision, complete hypothetical inputs or future successful
parametric evaluation would not establish reproduction or experimental validation.
Common scenario controls require documented model dependencies before they can
support a physical sensitivity claim. No current steady 0D model supplies flame
position, shape or time evolution for a calibrated visual twin.

**IMPLEMENTED:** mathematical dimensionless routing, provenance-aware assessment
and a guided React interface with Three.js. Numeric inputs start blank. Choosing
a clearly labelled setup explicitly accepts its source conditions/assumptions as
user declarations. Every scenario edit invalidates prior results.

In mathematical exploration mode, the 3D receives no numeric model outputs. Its fuel mesh, purple flame symbol,
colors, scale, lighting and illustrative orientation are presentation choices.
Only airflow direction, optional shape category and gravity label reflect scenario
declarations. None is an experimental observation. The fixed flame symbol remains
unchanged for positive, zero, negative or non-real branches and does not establish
physical burning. Display orientation is not a new physical model parameter.
No temperature, physical shape, dimensions, flame motion or extinction is inferred.
See the [complete 3D classification](digital-twin-3d.md#what-drives-the-3d).
**BLOCKED:** 2016/Urban numerical evaluation, unsupported physical outputs,
unreviewed essential citations/derivations and documented-experiment evaluation.
Urban's printed equation page remains unresolved. Complete hypothetical parameters
do not unblock either research evaluator.

**PENDING:** reviewed parameter evidence, dimensional conversion adapters,
transient models and calibrated visual prediction. **VALIDATED:** none of these models
has experimental validation by this project. Submitted citations and software
tests cannot automatically promote a result into scientific validation.

## SAFFIRE steady-reference playback boundaries

**IMPLEMENTED:** separate data-driven playback for three cited SAFFIRE cases.
**EXPERIMENTAL:** published steady Vf/lp references, with inherited file/page
transcriptions not independently reverified against the original PDF.
**DERIVED:** constant-speed local kinematics and a one-length transit window,
not measured continuous motion, ignition timing or a full burn.
**SCHEMATIC:** the envelope uses pyrolysis length as a visual proxy; flame
height/width/color and the growing dark traversed region are not measured flame
geometry, temperature, char extent or mass consumption. No uncertainty is invented.
No pixels are converted to lengths, and no image calibration is implied.

This consumes published outputs; it does not solve Urban's missing analytical
inputs or reproduce its equation. 2016/Urban evaluators remain **BLOCKED**.
**PENDING:** independently reviewed source/time series and calibrated observation
comparison. **VALIDATED:** no predictive physical model. See
[playback source limits and derivation](saffire-playback.md).

## Procedural appearance is not added predictive physics

**PHYSICS-DRIVEN** means the renderer obeys the existing derived SAFFIRE support,
rate/time and documented airflow direction. It does not mean measured instantaneous
flame geometry. **PHYSICALLY-INSPIRED** density, palette, noise, surface glow, char
appearance and heat-like background displacement are art parameters without
quantitative scientific meaning. Zero imposed upward drift is a visual convention,
not a solved buoyancy balance. Flow speed is displayed as an inherited experimental
condition; it does not set a fabricated quantitative turbulence or flame response.
There is no spark emission, color-temperature scale, CFD, new validation or change
to the blocked models. Pause and playback-rate controls affect presentation time.
See [complete classifications](digital-twin-3d.md#procedural-combustion-renderer-implemented).

## NASA Evidence Replay boundaries

The [comparison view and evidence audit](nasa-evidence-replay.md) do not establish
scientific fidelity. Exact Urban Vf/lp pairs remain unverified; the new replay
mode displays them only for audit and shows a generic 3D support without a flame
or physical animation. NASA-source-checked sample geometry does not establish
camera calibration or measured flame shape. Historical catalog availability does
not establish local image presence. Filename-relative timestamps do not register
the virtual playback clock. Synchronization and numerical fidelity errors remain
unavailable; no automatic promotion to validation is possible through metadata.


### Experimental validation preparation: updated source availability

The [focused Sample 5/C2 audit](saffire2-validation-audit.md) recovered both onboard
JPEG archives and the complete sensor workbook in ignored local storage. All
9,600 frames decode; 11,363 timestamped sensor rows were extracted. An exact
first-image/camera-trigger epoch match and five visual LED on/off pairs support
candidate registration. Sensor numbers remain outside runtime catalogs.
A sampled electrical-enable event is not optical ignition; arithmetic and coarse
LED agreement do not establish exposure latency, quantified clock stability or
alignment with the 3D's virtual steady window. The final frame lies 6 ms beyond
sensor coverage and is flagged. Calibration remains pending, and C2 alone cannot
uniquely recover volumetric depth. The first feasible target is a calibrated
planar front/base trajectory displayed with explicitly schematic depth.
Source-checked length/width also do not resolve conflicting thickness reports.
The existing reference-driven renderer cannot independently validate its own input
values or represent the entire ignition-to-termination experiment.
