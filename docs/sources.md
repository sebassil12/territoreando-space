# Fuentes

| ID | Archivo | Tipo | Uso |
|---|---|---|---|
| saffire_inventory | `descompressed/saffire_inventory.csv` | inventario de archivos (69.392 filas) | todos los catálogos |
| continuidad_series | `descompressed/continuidad_series.csv` | análisis previo de continuidad | contraste de estadísticas de secuencias (0 discrepancias) |
| continuidad_saltos | `descompressed/continuidad_saltos.csv` | lista de huecos | contraste de huecos |
| continuidad_cortes | `descompressed/continuidad_cortes_entre_series.csv` | relación entre series | notas de variantes / continuidad |
| continuidad_grupos | `descompressed/continuidad_grupos.csv` | intervalos de tiempo por grupo | solo contexto |
| structure.txt | `descompressed/structure.txt` | árbol de directorios | solo contexto |
| urban2019 | `descompressed/urban2019.pdf` | Urban et al., *Combustion and Flame* 199 (2019) 168–182, doi:10.1016/j.combustflame.2018.10.012 | valores y hechos publicados |
| archivos de imagen | `descompressed/<folder>/<file>` | fotogramas JPEG / PNG / TIFF, rejillas de distorsión | visor, métricas |
| dod | `descompressed/SAFFIRE-II DoD.docx` | descripción de datos (MSFC, 2018) | Tabla 2 + texto: S1…S9 → muestras, C1/C2 → cámaras, F1/F2 → pre/post-flow; Tabla 1 (imagen): material, espesor, flujo, ignitor; Tabla 3 (imagen): sensores; Tabla 4: variantes de imagen y BIT. Respalda `sample_conditions.csv` y hallazgos `F-dod-*`, `F-data-*` |
| nomenclature | `descompressed/SAFFIRE-II_Image_Directory_Nomenclature_v3.0.pdf` | glosario de conjuntos de imágenes | p.1: variantes (jpeg, jpeg2png_icmad, Raw2TIFF…) y "Cn" = número de cámara; la matriz de p.2 no es interpretable |
| merge_result | `descompressed/SAFFIRE-II_MergeResult-jpeg_v5_Final.xlsx` | manifiesto de JPEG recibidos | hoja `Received - jpeg` (182 336 nombres): cobertura local (`F-data-002`); `EpochTime` = número del nombre de archivo |
| co2_plot | `descompressed/SaffireIIStitchedCO2V7.pdf` | un gráfico raster de CO2 (%) vs. tiempo | solo contexto; sin valores numéricos ni origen de tiempo |
| tm_graphs | `descompressed/Saffire-II Sample 1 TM Graphs.docx` | 9 figuras raster de telemetría de la muestra 1 | solo contexto (`F-data-006`); la leyenda de la Figura 2 dice "Sample 2" |
| findings | `data/processed/findings.json` | hallazgos transcritos a mano con cita | API `/api/findings*`, asistente |
| sample_conditions | `data/processed/sample_conditions.csv` | condiciones por muestra con cita | API `/api/conditions`, `/api/compare` |

No disponibles: `i_Investigation.txt`, `s_PSI-99-2.txt`, los Excel de sensores citados en el DoD.
