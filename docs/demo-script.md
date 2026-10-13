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

## Separate model API

The Scenario Engine and dimensionless model remain API-only. The findings dashboard does not expose scenario controls or a physical flame simulation. Model arithmetic is unvalidated; it does not reproduce a published finding. See [model contract](dimensionless-model.md) and [Scenario Engine](scenario-engine.md).
