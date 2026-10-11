# Limitaciones científicas

Lo que el dashboard **no puede** concluir, y por qué.

| Afirmación | Estado | Motivo |
|---|---|---|
| Temperatura de la llama, tasa de liberación de calor | No disponible | Las imágenes no tienen calibración radiométrica. Brillo ≠ temperatura. |
| Riesgo de incendio de un material o una nave | No disponible | Los resultados publicados se aplican solo a sus condiciones de ensayo (urban2019 §6, hallazgo 6). |
| Concentración de oxígeno a partir de imágenes | No disponible | Las condiciones de ensayo provienen solo del artículo. |
| Qué muestra/material contiene una carpeta | No disponible | Ninguna fuente cargada relaciona S1…S9 / F1 / F2 con números de muestra de Saffire-2. |
| C1 / C2 = cámara 1 / cámara 2 | Interpretación candidata | Plausible (el artículo menciona dos cámaras) pero no documentado. |
| Longitudes en mm / cm, tasas de propagación | No disponible | Existen rejillas de distorsión (bloque de 30 mm), pero ningún mapeo píxel→mm está validado. |
| Tasas a partir de series Mapped TIFF | No apto | Huecos de hasta 183 s; intervalo mediano de 167 ms (no 33 ms). |
| Significado de "BIT", "ICMAD", grupos "F" | Desconocido | No documentado en las fuentes cargadas. |

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

## Valores de referencia publicados
Se muestran en la vista *Contexto científico*, etiquetados como *Referencia publicada*, con números de página. El
dashboard **no** los calcula y no están vinculados a ninguna secuencia de imágenes.
