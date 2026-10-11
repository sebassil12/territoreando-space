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
| Datos de sensores (O2, CO2, presión, temperaturas) | No disponible como números | Los Excel citados en el DoD no están; solo gráficos raster (muestra 1, CO2). |

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
