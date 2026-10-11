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
Un dashboard interactivo con IA que resume, jerarquiza e interpreta **hallazgos científicos** de combustión en
microgravedad para entregar insights trazables sobre seguridad contra incendios en vuelos espaciales tripulados.

La unidad primaria es el **hallazgo**: una afirmación publicada y citada (archivo + página) con su categoría de
confianza, su relevancia para la seguridad (ambas con justificación), sus condiciones de ensayo, su evidencia
vinculada y sus limitaciones. Las imágenes y secuencias son evidencia de respaldo.

## Flujo de producto (planificado)
1. **Explorar hallazgos** — lista jerarquizada con el criterio de orden visible.
2. **Entender confianza y relevancia para la seguridad** — categorías documentadas, nunca puntuaciones inventadas.
3. **Inspeccionar evidencia** — fuente citada, referencias publicadas y, si existe un vínculo documentado,
   secuencias y fotogramas.
4. **Comparar condiciones** — O2, flujo, presión, material, escala, solo con valores publicados.
5. **Recibir interpretación por IA** — etiquetada, basada solo en hallazgos citados, sin valores físicos nuevos.

## Capas
| Capa | Estado | Contenido |
|---|---|---|
| Evidencia | implementada | catálogos normalizados, metadatos de secuencias, calidad temporal, inventario de calibración, visor, métricas de píxeles, referencias publicadas |
| Hallazgos | planificada | `data/findings.json` (transcrito y citado), confianza, relevancia, ranking, comparación |
| Interpretación | parcial | hoy: asistente determinista sin LLM; objetivo: interpretación de hallazgos (LLM o determinista, decisión abierta) |

## Alcance
- Dentro del alcance: hallazgos citados y jerarquizados, confianza y relevancia para la seguridad con criterios
  documentados, comparación de condiciones publicadas, interpretación por IA restringida a fuentes, y la capa de
  evidencia existente (catálogos, visor, métricas de píxeles, referencias publicadas).
- Fuera del alcance (el producto **no es**): simulador CFD o modelo físico; predictor universal de riesgo de incendio;
  gemelo digital; sistema de seguridad certificado o herramienta de decisión operativa; aplicación centrada en una
  galería de imágenes. Tampoco infiere temperatura, liberación de calor, oxígeno ni material a partir de píxeles.

## Usuarios
Estudiantes, desarrolladores y personas sin formación aeroespacial que quieren entender qué se sabe sobre el fuego en
microgravedad y por qué importa para la seguridad en vuelos tripulados.

## Reglas
1. Toda afirmación científica mostrada en la UI cita una fuente (archivo + página).
2. Los datos observados, las métricas derivadas de imagen, los resultados publicados, la interpretación por IA y las
   limitaciones se etiquetan por separado.
3. Las etiquetas de carpeta (S1…S9, F1, F2, C1, C2) no se interpretan como números de muestra ni identidades de cámara.
4. Los archivos originales en `descompressed/` nunca se modifican.
5. Confianza, relevancia para la seguridad y ranking usan categorías y criterios documentados; ver `AGENTS.md`
   (reglas 11–17).
