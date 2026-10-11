# Auditoría de datos de `descompressed/`

Fecha de corte: 2026-10-11, rama `feat/data-audit-inventory`. Alcance: **solo** la carpeta `descompressed/`
(rutas relativas a ella salvo indicación). Se asume que todo el material es de SAFFIRE-II; no se asume nada sobre
SAFFIRE-I ni SAFFIRE-III. El inventario archivo por archivo está en `docs/data-inventory.csv`
(`uv run python -m pipeline.build_inventory`). Ningún archivo fuente se modificó (ver «Verificación» al final).

Convenciones: **verificado** = leído directamente del archivo citado; **inferido** = deducción del auditor, se
indica siempre. "DoD" = `SAFFIRE-II DoD.docx` (autora en metadatos: Payne, Cheryl B., MSFC; modificado 2018-09-05).

## Resumen ejecutivo

- `descompressed/` contiene **69 404 archivos regulares, 2 078 960 726 bytes** (≈2,08 GB): 69 392 imágenes y
  12 documentos en la raíz. Todos son legibles; ninguno es un directorio con nombre de archivo (`*.csv`, `*.docx`
  son archivos reales, verificado por firma). No hay duplicados exactos por sha256 (se hashearon los 69 404).
- `saffire_inventory.csv` lista exactamente las 69 392 imágenes presentes (0 faltantes, 0 sin listar).
- **Tres documentos no usados hasta ahora cambian lo que se puede afirmar**:
  1. `SAFFIRE-II DoD.docx` (Tabla 2 y texto) mapea explícitamente `S1…S9` → muestras 1…9, `F1`/`F2` → pre-flow /
     post-flow y `C1`/`C2` → cámara 1 / cámara 2. Su Tabla 1 (imagen incrustada) da material, espesor, flujo de aire
     y posición del ignitor de cada muestra.
  2. `SAFFIRE-II_Image_Directory_Nomenclature_v3.0.pdf` p.1 define las variantes de procesamiento y que "Cn" es el
     número de cámara.
  3. `SAFFIRE-II_MergeResult-jpeg_v5_Final.xlsx` es el manifiesto de descarga: su columna `EpochTime` coincide con
     el número del nombre de cada JPEG, y muestra que localmente solo está ≈29 % de los JPEG recibidos.
- Esto **contradice** premisas vigentes del repositorio (AGENTS.md regla 5, `docs/scientific-limitations.md`,
  `docs/sources.md`): ver «Calidad de datos y brechas» y la decisión abierta al final.
- Los datos de sensores (temperaturas, radiómetros, O2, CO2, presión, flujo) **no están** como datos numéricos;
  solo hay gráficos raster de la muestra 1 y un gráfico de CO2.
- MVP recomendado: muestras 5 (SIBAL, 20 cm/s) y 9 (PMMA plano), con S6 como comparación condicionada a resolver
  un conflicto de flujo entre fuentes.

### Leyenda del inventario (`docs/data-inventory.csv`)
| Código en `source_of_metadata` | Significado |
|---|---|
| `signature` | tipo detectado por bytes mágicos (JPEG `FFD8FF`, PNG, TIFF `II*`/`MM*`, `%PDF`, zip → docx/xlsx por contenido) |
| `pillow_header` | dimensiones y modo leídos de la cabecera, sin decodificar píxeles |
| `saffire_inventory.csv` | `group`, `camera`, `file_type`, `part`, `raw_id` de esa fila del inventario fuente |
| `DoD-T2` | `SAFFIRE-II DoD.docx`, Tabla 2 (texto en `word/document.xml`): SnCm = "Sample n, camera m" |
| `DoD-T1-image` | `SAFFIRE-II DoD.docx`, Tabla 1, imagen `word/media/image1.png`; **transcripción visual** del auditor |
| `content_parsed` / `role_by_manual_review` | documentos: campos leídos del contenido; `data_role` asignado tras leerlo |

- `first_raw_id`, `last_raw_id`, `temporal_quality` y `processing_variant` de una fila de imagen describen la
  **secuencia que la contiene** (carpeta), calculada con los helpers de `pipeline/build_catalog.py`; `notes` lleva
  `seq=<sequence_id>`. El `raw_id` propio está en el nombre del archivo.
- `bit_depth` = bits por canal según el modo de Pillow (todas las imágenes: modo RGB, 8 bits).
- `sample` se rellena para S1…S9 (salvo BIT); `material` solo para secuencias de imagen de S1…S9 (no para BIT ni
  rejillas). `confidence`: `high` = solo hechos del archivo; `medium` = incluye mapeo documental de muestra/material;
  `low` = ilegible, faltante o rol desconocido.
- Tamaño del CSV: 28,9 MB (69 404 filas). Reproducible en ≈10–20 s.

## Panorama del dataset

### Por tipo detectado (firma)
| Tipo | Archivos | MB | Extensiones |
|---|---:|---:|---|
| jpeg | 57 968 | 442,1 | `.jpeg` |
| png | 9 513 | 565,1 | `.png` (nombres `*.jpeg.png`) |
| tiff | 1 911 | 1 033,9 | `.tif` (1 899 fotogramas + 12 rejillas) |
| text | 6 | 11,2 | 5 `.csv`, 1 `.txt` |
| xlsx | 1 | 20,8 | `.xlsx` |
| pdf | 3 | 5,0 | `.pdf` |
| docx | 2 | 1,0 | `.docx` |

Ninguna extensión contradice la firma.

### Por grupo (etiqueta de carpeta; significado según DoD-T2)
| Grupo | Significado documentado | Archivos | MB | Contenido local |
|---|---|---:|---:|---|
| F1 | pre-flow (DoD) | 1 200 | 56,8 | **solo BIT** (C1 600, C2 600); las imágenes pre-flow no están |
| F2 | post-flow (DoD) | 1 618 | 77,8 | Raw JPEG C1 809, C2 809 |
| S1 | Muestra 1 | 10 601 | 82,3 | C2 raw part1 + mapped part2 (5 000 + 5 000), BIT C1/C2 (300 + 300), rejilla C2 |
| S2 | Muestra 2 | 1 | 0,3 | solo rejilla C2 |
| S3 | Muestra 3 | 5 001 | 24,7 | C2 raw part1, rejilla |
| S4 | Muestra 4 | 24 515 | 424,7 | C1 raw+mapped part2; C2 raw+mapped part3, ICMAD PNG part2; 2 rejillas |
| S5 | Muestra 5 | 10 983 | 634,4 | C2 mapped JPEG part1, ICMAD PNG part1, Mapped TIFF; 2 rejillas |
| S6 | Muestra 6 | 5 520 | 691,2 | C1 Mapped TIFF ICMAD v2; C2 mapped part2; 2 rejillas |
| S7 | Muestra 7 | 1 | 0,3 | solo rejilla C1 |
| S8 | Muestra 8 | 4 951 | 27,1 | C1 raw part4, rejilla |
| S9 | Muestra 9 | 5 001 | 21,6 | C1 raw part1, rejilla |
| (raíz) | documentos | 12 | 37,9 | ver «Contenido y rol» |

### Por rol (`data_role`)
| Rol | Archivos | MB |
|---|---:|---:|
| primary (secuencia primaria, reglas de `build_catalog.assign_roles`) | 51 599 | 1 296,2 |
| processing_variant (misma ventana temporal, otra variante) | 15 981 | 661,3 |
| bit_sequence | 1 800 | 80,0 |
| calibration_grid | 12 | 3,5 |
| documentos (8 roles distintos, ver abajo) | 12 | 37,9 |

### Secuencias (21 carpetas de imágenes)
| sequence_id | Carpeta | n | Rol | temporal_quality | Ventana (s) | Dimensiones |
|---|---|---:|---|---|---:|---|
| F1-C1-bit-jpeg-single | `SAFFIRE_II_F1C1-BIT_jpeg` | 600 | bit_sequence | continuous | 20,0 | 1360x1024 |
| F1-C2-bit-jpeg-single | `SAFFIRE_II_F1C2_BIT_jpeg` | 600 | bit_sequence | continuous | 20,0 | 1360x1024 |
| S1-C1-bit-jpeg-single | `SAFFIRE_II_S1C1_BIT_jpeg` | 300 | bit_sequence | continuous | 10,1 | 1360x1024 |
| S1-C2-bit-jpeg-single | `SAFFIRE_II_S1C2_BIT_jpeg` | 300 | bit_sequence | continuous | 10,0 | 1360x1024 |
| S1-C2-raw-jpeg-part1 | `SAFFIRE-II_S1C2_Image_Data_All-JPEGS_part1` | 5 000 | primary | continuous | 166,6 | 640x140 |
| S1-C2-mapped-jpeg-part2 | `SAFFIRE-II_S1C2_Image_Data_All-JPEGs_Mapped_part2` | 5 000 | primary | continuous | 166,6 | 691x152 |
| S3-C2-raw-jpeg-part1 | `SAFFIRE_II_S3C2_Image_Data_All-JPEGs_part1` | 5 000 | primary | continuous | 166,6 | 640x140 |
| S4-C1-raw-jpeg-part2 | `SAFFIRE-II_S4C1_Image_Data_All_JPEGs_part2` | 5 000 | primary | continuous | 166,6 | 492x160 |
| S4-C1-mapped-jpeg-part2 | `SAFFIRE-II_S4C1_Image_Data_All_JPEGs_Mapped_part2` | 5 000 | processing_variant | overlapping_variant | 166,6 | 672x142 |
| S4-C2-icmad-png-part2 | `SAFFIRE-II_S4C2_Image_Data_jpegs2png_icmad_part2` | 4 513 | primary | continuous | 150,4 | 622x175 |
| S4-C2-raw-jpeg-part3 | `SAFFIRE-II_S4C2_Image_Data_All_JPEGs_part3` | 5 000 | primary | continuous | 166,6 | 442x160 |
| S4-C2-mapped-jpeg-part3 | `SAFFIRE-II_S4C2_Image_Data_All-JPEGs_Mapped_part3` | 5 000 | processing_variant | overlapping_variant | 166,6 | 614x250 |
| S5-C2-mapped-jpeg-part1 | `SAFFIRE-II_S5C2_Image_Data_All_JPEGs_Mapped_part1` | 5 000 | primary | continuous | 166,6 | 813x173 |
| S5-C2-icmad-png-part1 | `SAFFIRE_II_S5C2_Image_Data_jpegs2png_icmad_part1` | 5 000 | processing_variant | overlapping_variant | 166,6 | 674x163 |
| S5-C2-mapped-tiff-single | `SAFFIRE-II_S5C2_Image_Data_RAW2TIFF_Mapped` | 981 | processing_variant | gap_detected | 315,8 | 813x173 |
| S6-C1-mapped-icmad-tiff-single | `SAFFIRE-II_S6C1_Image_Data_RAW2TIFF_Mapped_v2_ICMAD` | 918 | primary | gap_detected | 315,8 | 726x291 |
| S6-C2-mapped-jpeg-part2 | `SAFFIRE-II_S6C2_Image_Data_All_JPEGs_Mapped_part2` | 4 600 | primary | continuous | 153,3 | 823x152 |
| S8-C1-raw-jpeg-part4 | `SAFFIRE-II_S8C1_Image_Data_All_JPEGs_part4` | 4 950 | primary | continuous | 165,0 | 846x170 |
| S9-C1-raw-jpeg-part1 | `SAFFIRE-II_S9C1_Image_Data_All_JPEGs_part1` | 5 000 | primary | continuous | 166,6 | 826x166 |
| F2-C1-raw-jpeg-single | `SAFFIRE_II_F2C1_Image_Data_All_JPEGS` | 809 | primary | continuous | 26,9 | 1280x916 |
| F2-C2-raw-jpeg-single | `SAFFIRE_II_F2C2_Image_Data_All-JPEGS` | 809 | primary | continuous | 26,9 | 1280x916 |

Ventana = (last_raw_id − first_raw_id)/1000. Intervalo mediano: ≈33 ms en JPEG/PNG, 167 ms en TIFF
(`continuidad_series.csv`).

## Contenido y rol

| Familia | Contenido (verificado) | Aporte al dashboard | Lo que no puede sostener | Rutas |
|---|---|---|---|---|
| Fotogramas JPEG de muestra (raw / mapped) | Secuencias de ≈5 000 fotogramas RGB 8 bits a ≈33 ms; "jpeg" = creados a bordo y descargados; "Mapped" = distorsión corregida a una rejilla plana (Nomenclature p.1; DoD Tabla 4) | Visor, procedencia, calidad temporal, métricas de píxeles | Temperatura, tasa de calor, O2, riesgo; longitudes en mm/cm (sin calibración validada); el instante de ignición (no está en los archivos de imagen) | `SAFFIRE-II_S*C*_Image_Data_All*JPEG*/` |
| ICMAD PNG | JPEG anotados con 'Exposure' y 'Gain' añadidos en la parte inferior del fotograma y guardados como PNG (Nomenclature p.1; DoD Tabla 4) | Contexto de exposición/ganancia por fotograma (si se lee la banda) | Métricas de píxeles comparables con JPEG sin recortar la banda: S5C2 PNG mide 674x163 frente a la rejilla 674x148 (inferido: ≈15 filas de anotación) | `*_jpegs2png_icmad_part*/` |
| Mapped TIFF (RAW2TIFF) | RAW demosaicado (IrfanView) y corregido por distorsión; S6C1 además anotado ICMAD (Nomenclature p.1; DoD Tabla 4); ≈6 fps | Fotogramas de mayor calidad para inspección | Tasas: ambas secuencias son `gap_detected` (huecos de 4,5 s, 0,5 s y 157,5 s en S5C2; 3,2 s y 183,0 s en S6C1, `continuidad_saltos.csv` filas 2–6) | `SAFFIRE-II_S5C2_Image_Data_RAW2TIFF_Mapped/`, `SAFFIRE-II_S6C1_Image_Data_RAW2TIFF_Mapped_v2_ICMAD/` |
| BIT | "Built-In Test images were captured immediately after the payload was powered on" (DoD Tabla 4); 1360x1024 | Contexto de hardware; demostración de cámaras | Nada sobre ninguna muestra: aunque las carpetas se llamen F1/S1, el xlsx los lista bajo `BIT Received` | `SAFFIRE_II_*BIT_jpeg/` |
| Rejillas de distorsión | Caracterización pre-vuelo de la distorsión con un patrón de tablero (DoD Tabla 4); 12 TIFF, 11 con "30mmBlock" en el nombre | Inventario de calibración pendiente | Conversión píxel→mm: no hay rejillas "Mapped" locales ni mapeo validado | `*_DistortionGrids_*/` |
| `SAFFIRE-II DoD.docx` | Objetivos, Tabla 1 (muestras), Tabla 2 (registros PSI), Tabla 3 (diagnósticos), Tabla 4 (conjuntos de imágenes); 3 imágenes incrustadas | Mapeo muestra/material/condiciones con cita | Valores medidos; Tablas 1 y 3 son imágenes (requieren transcripción manual) | `SAFFIRE-II DoD.docx` |
| `SAFFIRE-II_Image_Directory_Nomenclature_v3.0.pdf` | 2 páginas: definiciones de variantes (p.1) y matriz de contenido del paquete por grupo (p.2, marcas X sin etiquetas de fila extraíbles) | Glosario de variantes | La matriz de p.2 no se puede interpretar sin las etiquetas de fila | ídem |
| `SAFFIRE-II_MergeResult-jpeg_v5_Final.xlsx` | 13 hojas: `Received - jpeg` (12 columnas *Received*) y una hoja por conjunto (`BIT`, `PreFlowVis`, `PostFlowVis`, `Sample1…9 - jpeg`) con `EpochTime`, `Jpeg File Name`, tamaño, zip | Completitud: qué fotogramas se recibieron vs. cuáles hay localmente; base de tiempo | Contenido de imágenes; datos de sensores | ídem |
| `urban2019.pdf` | Urban et al. 2019, 15 pp.; ya transcrito en `data/scientific_reference_results.json` (8 resultados, 7 hechos) | Única fuente de resultados publicados | Vínculo con fotogramas concretos | ídem |
| `Saffire-II Sample 1 TM Graphs.docx` | 9 figuras raster (aire/tacómetro, radiómetro, temperaturas de pluma, muestra y entrada, CO2, O2, presión, humedad) con corriente del ignitor; tiempo relativo (Figura 6: eje 0–500 s, origen no documentado) | Contexto visual de telemetría de la muestra 1 | Valores numéricos (solo píxeles de gráfico); sincronía con fotogramas (sin epoch); la leyenda de la Figura 2 dice "Sample 2" | ídem |
| `SaffireIIStitchedCO2V7.pdf` | 1 página (Igor Pro): CO2 (%) 0,30–0,50 vs. tiempo (s) 0–≈8 400 con corte de eje | Contexto visual | Valores numéricos; origen del tiempo; a qué muestras corresponde cada tramo | ídem |
| `saffire_inventory.csv` | 69 392 filas (`folder, file_name, file_type, group, camera, mapped, part, raw_id, extension`), procedencia no documentada (valores en español, p. ej. `Sí`) | Entrada de `build_catalog` | — | ídem |
| `continuidad_*.csv` (4) | Análisis previo de continuidad: series (21), saltos (5), cortes entre series (7), grupos (9) | Contraste de calidad temporal | Procedencia no documentada | ídem |
| `structure.txt` | Árbol de directorios (69 432 líneas) | Contexto | — | ídem |

## Hallazgos soportados

Solo afirmaciones explícitas en archivos locales. Ninguna se deriva de nombres de archivo.

| # | Afirmación | Tipo de evidencia | Fuente exacta | Confianza | Limitaciones |
|---|---|---|---|---|---|
| H1 | Los registros SAFFIRE-II SnCm corresponden a "Sample n, camera m"; F1 = pre-flow, F2 = post-flow; C1/C2 = cámara 1/2 | Documento (texto) | DoD, Tabla 2 y párrafos tras la Figura 1 | Alta | El vínculo carpeta local → registro PSI se hace por la etiqueta compartida (inferido, coherente con xlsx: `S1 Received` lista `S1C2-*.jpeg`) |
| H2 | "Cn" denota el número de cámara; "Xn" el tipo y número de corrida | Documento (texto) | Nomenclature PDF p.1 | Alta | — |
| H3 | Materiales por muestra: S1–S4 silicona (0,25 / 0,61 / 1,02 / 0,36 mm); S5–S6 tela SIBAL (0,33 mm); S7 "PMMA to Nomex" (0,33 mm); S8 PMMA estructurado y S9 PMMA plano (10 mm, borde ahusado); flujo 20 cm/s salvo S6 y S9 (30 cm/s); ignitor aguas arriba salvo S4 (aguas abajo); 9 muestras de 5 cm × 29 cm | Documento (tabla como imagen) | DoD, Tabla 1 (`word/media/image1.png`) y primer párrafo | Media (transcripción visual) | S5/S6 SIBAL y S9 PMMA plano de 1 cm se corroboran en `urban2019.pdf` pp. 173–174 y 180–181; el resto, solo DoD |
| H4 | El número en el nombre de cada JPEG es igual al valor de la columna `EpochTime` del manifiesto | Hoja de cálculo | xlsx, hojas `BIT - jpeg`…`Sample9 - jpeg`, columnas A y E (p. ej. `Sample1 - jpeg` fila 2: `1479773202565` / `S1C2-1479773202565.jpeg`) | Alta (igualdad); media (que sea Unix epoch en ms: solo lo indica el encabezado) | Refuerza la regla `raw_id` = ms de `docs/data-lineage.md`, hoy marcada como inferencia |
| H5 | Definiciones de variantes: jpeg, Mapped, jpeg2png_icmad, Raw2TIFF, Raw2TIFF_icmad(_Mapped), BIT, DistortionGrids | Documento (texto) | Nomenclature PDF p.1; DoD Tabla 4 | Alta | — |
| H6 | Sensores del experimento: termopares (flujo, llama, pluma), radiómetros, CO2, O2, presión, anemómetros, cámaras, hilo de humo; "the raw data ... presented in excel files" en PSI | Documento | DoD Tabla 3 (imagen `image3.png`) y párrafo previo | Media (Tabla 3 es imagen) | Esos Excel de sensores **no están** en `descompressed/` |
| H7 | Solo una fracción de los JPEG recibidos está localmente (ver tabla abajo) | Hoja de cálculo vs. inventario | xlsx hoja `Received - jpeg`, columnas A–L; `saffire_inventory.csv` | Alta | Compara nombres (quitando `Mapped_` y `.png`); los TIFF provienen de RAW y no están en este manifiesto |
| H8 | Resultados publicados de S5, S6 (condición) y S9 | Publicación | `urban2019.pdf` pp. 173, 177, 180 (ya en `data/scientific_reference_results.json`) | Alta | No vinculados a fotogramas concretos |
| H9 | Las ventanas locales de S1C2 raw→mapped son consecutivas (34 ms) y S4/S5 tienen variantes del mismo rango | Análisis derivado + recálculo | `continuidad_cortes_entre_series.csv` filas 3–8; recalculado en el inventario | Alta | Variantes nunca se concatenan (regla 6) |

Cobertura del manifiesto (H7):

| Columna xlsx | Recibidos | Presentes localmente (cualquier variante) |
|---|---:|---:|
| BIT Received | 1 800 | 1 800 |
| F1 FV Received | 1 618 | 0 |
| F2 FV Received | 1 618 | 1 618 |
| S1 Received (C2) | 11 400 | 10 000 |
| S2 Received (C2) | 15 000 | 0 |
| S3 Received (C2) | 15 000 | 5 000 |
| S4 Received (C1 15 000, C2 15 000) | 30 000 | 14 513 (C1 5 000, C2 9 513) |
| S5 Received (C1 9 600, C2 9 600) | 19 200 | 5 000 (C2) |
| S6 Received (C1 9 600, C2 9 600) | 19 200 | 4 600 (C2) |
| S7 Received (C1) | 18 600 | 0 |
| S8 Received (C1) | 19 950 | 4 950 |
| S9 Received (C1) | 28 950 | 5 000 |
| **Total** | **182 336** | **52 481 (≈28,8 %)** |

## Alineación con la misión

| Capacidad | Estado | Razón | Rutas |
|---|---|---|---|
| Resumir hallazgos | Parcialmente soportado | Hay contenido citable (urban2019; DoD Tablas 1–4) pero no existe modelo de hallazgos (`data/findings.json` planificado) | `urban2019.pdf`, `SAFFIRE-II DoD.docx`, `data/scientific_reference_results.json` |
| Jerarquizar (ranking) | No soportado aún | Sin esquema de hallazgos ni criterios aprobados (D2 en `docs/implementation-plan.md`) | — |
| Interpretación por IA | No soportado aún | El asistente es determinista y no conoce hallazgos; la base citable ya existe | `backend/assistant.py` |
| Comparar condiciones | Parcialmente soportado | DoD Tabla 1 da material, espesor, flujo e ignitor de las 9 muestras; urban2019 da O2 22,1 % y presión 1 atm (S5). Conflicto de flujo en S6 sin resolver | DoD Tabla 1; `urban2019.pdf` p.173, p.177 |
| Inspeccionar evidencia | Soportado | Fotogramas locales de S1, S3, S4, S5, S6, S8, S9, F2 con procedencia y calidad temporal; ahora con muestra/material documentados | `docs/data-inventory.csv`, `data/processed/*` |
| Explicar limitaciones | Soportado | Huecos, variantes, calibración pendiente, cobertura parcial y ausencia de sensores están documentados y medidos | este documento, `docs/scientific-limitations.md` |

## Calidad de datos y brechas

**Archivos ausentes (verificado contra el manifiesto xlsx y DoD Tabla 2).**
- Sin imágenes locales de S2 y S7 (solo rejillas), ni de S5C1, S6C1 en JPEG, ni de F1 pre-flow (las carpetas F1 son BIT).
- Muestras con imágenes locales parciales: S1 10 000/11 400; S3, S8, S9 ≈17–33 %. Las carpetas JPEG/PNG de
  muestra cubren ≈150–167 s cada una; urban2019 p.180 reporta que S9 duró 900 s, así que los fotogramas locales de S9 cubren una
  parte de la prueba (cuál parte: desconocido, el instante de ignición no está en los archivos locales).
- Datos de sensores en Excel citados en DoD (H6): ausentes. `i_Investigation.txt` y `s_PSI-99-2.txt`: ausentes.
- No hay rejillas "Mapped" (`DistortionGrids_Sample_ROI_Mapped`, DoD Tabla 4) ni RAW (`Raw_DistroMaster`).

**Campos ausentes.** Instante de ignición por muestra; exposición/ganancia como datos (solo como banda en ICMAD);
O2 y presión por muestra salvo S5 (urban2019 p.177); flujo de S9 solo en DoD.

**Mapeos ambiguos o en conflicto.**
- **Flujo de S6**: 25 cm/s en `urban2019.pdf` p.173 ("20 cm/s and 25 cm/s for Samples 5 and 6, respectively") vs.
  30 cm/s en DoD Tabla 1. No se resuelve aquí; el inventario no registra flujos.
- `urban2019.pdf` p.173 también dice "25 cm/s for the Saffire-2 experiments" al describir la muestra grande de
  Saffire-1/-3 (posible errata; no se interpreta).
- Leyenda de la Figura 2 de `Saffire-II Sample 1 TM Graphs.docx` dice "Sample 2" en un documento de la muestra 1.
- Matriz de la p.2 de Nomenclature PDF: marcas X sin etiquetas de fila extraíbles.
- Procedencia de `saffire_inventory.csv` y `continuidad_*.csv`: no documentada (probable trabajo previo del equipo).

**Discontinuidades temporales.** `S5-C2-mapped-tiff-single` y `S6-C1-mapped-icmad-tiff-single` son `gap_detected`
(`continuidad_saltos.csv`); el resto de las secuencias es `continuous` u `overlapping_variant`. El S4C2 ICMAD
part2 termina 16,3 s antes de que empiece el part3 (`continuidad_cortes_entre_series.csv` fila 5).

**Sensores/condiciones no disponibles.** Ver H6. La telemetría de la muestra 1 y el CO2 solo existen como gráficos.

**Calibración sin validar.** 12 rejillas, `status=pending` en todas; `S7C1` sin longitud de referencia en el nombre.
Dimensiones de las rejillas coinciden con fotogramas raw (p. ej. S8C1 846x170, S9C1 826x166) pero no con los mapped
(S1C2 mapped 691x152 vs. rejilla 640X140): la rejilla describe la ROI sin corregir.

**Desajustes entre catálogos existentes y archivos reales.**
- `data/processed/sequence_catalog.csv` (21 secuencias) y `frame_catalog.csv` (69 380 fotogramas) coinciden con
  las 69 392 imágenes menos las 12 rejillas: sin desajuste de archivos.
- `data/processed/calibration_catalog.csv` vincula la rejilla S1C2 (ROI 640x140) con `S1-C2-bit-jpeg-single`
  (fotogramas BIT 1360x1024): vínculo no aplicable. El inventario nuevo no lo hace.
- `docs/sources.md` omite DoD, Nomenclature PDF y el xlsx; AGENTS.md regla 5 y `docs/scientific-limitations.md`
  dicen que ninguna fuente mapea S1…S9 a muestras, lo cual DoD contradice.
- `docs/data-lineage.md` dice que ningún archivo documenta `raw_id` como ms; el xlsx lo nombra `EpochTime` (H4).

## Recomendación de MVP

Subconjunto mínimo defendible (todo SAFFIRE-II):
1. **Muestra 5 (SIBAL, 20 cm/s)**: `S5-C2-mapped-jpeg-part1` (primaria, continua) como evidencia ilustrativa;
   resultados publicados `saffire2-s5-spread-rate` y `saffire2-s5-pyrolysis-length` (urban2019 p.177); material
   documentado en DoD Tabla 1 y urban2019 p.173. Es la única muestra con material, condición y resultado publicados.
2. **Muestra 9 (PMMA plano)**: `S9-C1-raw-jpeg-part1`; resultados `saffire2-s9-limiting-length` y
   `saffire2-s9-duration` (urban2019 p.180). Mostrar explícitamente que los fotogramas locales cubren ≈167 s de 900 s.
3. **Comparación de condiciones** de las 9 muestras desde DoD Tabla 1 (material, espesor, flujo, ignitor), marcando
   las muestras sin imágenes locales (S2, S7) y el conflicto de flujo de S6.

Diferido: S6 como comparación de flujo (hasta resolver 25 vs. 30 cm/s); métricas de ICMAD PNG (banda de
anotación); TIFF con huecos; BIT y F2 (sin hallazgo asociado); telemetría (solo gráficos); cualquier mm/cm.

## Próximos datos necesarios

**Esenciales**
- Los Excel de sensores de PSI citados en DoD (H6), al menos para S5 y S9: O2, presión, flujo, ignitor con base de
  tiempo epoch, para ubicar la ignición en los fotogramas.
- Confirmación del flujo de S6 (fuente primaria adicional o fe de erratas).
- Las partes faltantes de las secuencias de S5 y S9 (el manifiesto xlsx lista 19 200 y 28 950 recibidos).

**Opcionales**
- Rejillas `DistortionGrids_Sample_ROI_Mapped` y un procedimiento documentado de calibración píxel→mm.
- Imágenes de S2, S7 y F1 pre-flow; `SAFFIRE Objectives, Development and Status.pdf` (citado en DoD).
- Documentación de procedencia de `saffire_inventory.csv` y `continuidad_*.csv`.

## Verificación de inmutabilidad

Antes del trabajo se registraron tamaño, mtime (ns) y sha256 de 20 archivos (los 12 documentos de la raíz y 8
imágenes de distintas familias); al terminar se compararon y no cambiaron. Las pruebas
`tests/test_inventory.py::test_source_files_are_not_modified` comprueban lo mismo sobre datos sintéticos.
