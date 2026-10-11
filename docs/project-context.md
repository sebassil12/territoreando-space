# Contexto del proyecto

## Reto
NASA Space Apps Challenge 2026 — *Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data*.
Los requisitos oficiales finales se publican el 28 de octubre de 2026; todo lo que dependa de ellos se mantiene
configurable y no se da por supuesto aquí.

## Investigación
Saffire-II (Spacecraft Fire Safety Experiment II), realizado en el vehículo Cygnus durante la misión CRS OA-5, después
de que este dejara la ISS. Quemó nueve muestras de 29 cm × 5 cm en un túnel de flujo, entre ellas tejido de algodón y
fibra de vidrio SIBAL (Muestras 5 y 6) y una placa de PMMA de 1 cm de espesor (Muestra 9). Fuente: `urban2019.pdf`,
Sección 2.2 (p.173).
La etiqueta del conjunto de datos "PSI-99" proviene de la descripción del reto; `i_Investigation.txt` y
`s_PSI-99-2.txt` **no** están entre las fuentes cargadas.

## Objetivo
Ayudar a las personas a explorar la evidencia de combustión en microgravedad: secuencias de imágenes, su continuidad
temporal, los recursos de calibración y los hallazgos publicados, con cada valor trazable hasta un archivo.

## Alcance
- Dentro del alcance: dashboard de exploración de evidencia, catálogos normalizados, estadísticas de píxeles, valores
  de referencia publicados, un asistente determinista basado en fuentes.
- Fuera del alcance: CFD, simulación física, predicción de riesgo de incendio, gemelo digital, inferencia de
  temperatura o de liberación de calor.

## Usuarios
Estudiantes, desarrolladores y personas sin formación aeroespacial.

## Reglas
1. Toda afirmación científica mostrada en la UI cita una fuente (archivo + página).
2. Los datos observados, las métricas derivadas de imagen, los resultados publicados y la interpretación se etiquetan
   por separado.
3. Las etiquetas de carpeta (S1…S9, F1, F2, C1, C2) no se interpretan como números de muestra ni identidades de cámara.
4. Los archivos originales en `descompressed/` nunca se modifican.
