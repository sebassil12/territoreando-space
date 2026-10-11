# Guion de demo (≈4 min)

> **Demo del estado actual (capa de evidencia).** Recorre lo que existe hoy: catálogo, visor y referencias
> publicadas. El producto objetivo es findings-first (hallazgo → confianza/relevancia → evidencia → comparación →
> interpretación por IA); ese guion se escribirá cuando exista la capa de hallazgos (backlog P1-4 en
> `docs/implementation-plan.md`). En el paso 1, presentar la herramienta como "la capa de evidencia de un dashboard
> de hallazgos", no como el producto final.

Inicie ambos servidores (README → Ejecutar) y abra http://localhost:5173.

1. **Resumen** — "Saffire-II quemó nueve muestras en órbita; las llamas en microgravedad se comportan de forma distinta.
   Esto es un explorador de evidencia, no un simulador." Señale las citas.
2. **Secuencias** — filtre `calidad temporal = gap_detected`: las dos series Mapped TIFF. Quite el filtro; muestre
   `S4-C1-mapped-jpeg-part2` marcada como *variante de procesamiento de S4-C1-raw-jpeg-part2*, nunca combinada.
3. Haga clic en **S1-C2-raw-jpeg-part1** — insignia *continua*, 5000 fotogramas, 166,6 s, Δt mediano 33 ms.
4. **Reproducir** y luego pausar. Muestre el recuadro de procedencia: fuente, secuencia, fotograma, raw_id, tiempo,
   calidad temporal. Detalle del fotograma: ruta relativa original, archivo fuente, advertencias.
5. **Análisis** — intensidad media vs. tiempo. Señale los picos periódicos y explique el LED verde (0,4 s cada 2 s,
   urban2019 p.173). Haga clic en el gráfico para saltar a ese fotograma.
6. Abra `#Viewer/S6-C1-mapped-icmad-tiff-single` — advertencias de huecos, línea cortada en el gráfico.
7. **Contexto científico** — tasa de propagación de la Muestra 5: 2,03 mm/s; longitud límite del PMMA de la Muestra 9:
   ~9 cm, cada una con su página. "Estos valores están publicados, no los calculamos nosotros."
8. **Asistente** — pregunte "¿Esta secuencia es continua?" y luego "¿Cuál es la temperatura de la llama?" → *Not available
   in the loaded sources*, con el motivo (las respuestas del asistente están en inglés).
9. **Fuentes y limitaciones** — qué podemos y qué no podemos concluir; calibración *pending*.

Frase de cierre: "Convertimos datos experimentales difíciles de explorar en evidencia trazable y honesta."
