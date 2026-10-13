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

## Model and reproducibility-audit sources

| ID | File | Kind | Used for |
|---|---|---|---|
| bhattacharjee2003 | [`20040053557.pdf`](https://ntrs.nasa.gov/api/citations/20040053557/downloads/20040053557.pdf), NASA NTRS 20040053557 | Conference paper; definitions Eq. (2), p.201; thin branch Eq. (5), p.202 | Equation verified directly; independent dimensionless model API |
| bhattacharjee2016 | [Original publication](https://doi.org/10.1016/j.combustflame.2015.10.023); NASA republication [`TM-20210011385.pdf`](https://ntrs.nasa.gov/api/citations/20210011385/downloads/TM-20210011385.pdf), Chapter 2, pp.19–29 | Bhattacharjee, Simsek, Olson and Ferkul, *Combustion and Flame* 163 (2016) 472–477 | Research only; verified critical-flow equation; incomplete numerical reproducibility |
| urban2019-html | [Publisher article](https://www.sciencedirect.com/science/article/pii/S0010218018304395), Sections 1.1 and 2 | Accessible article preview; PDF unavailable in this checkout | Research-only verification of analytical Eq. (2), scaling Eq. (6) and conditions; printed equation page unresolved |
| saffire2-psi-readme | [`PSI-99_Science Documents_SAFFIRE-II Readme.docx`](https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file=6840cdd84a0e24d624cebd95&version=1), version 1 | NASA PSI-99, Table 1, p.1; data organization, p.2; processing definitions, p.3 | Research-only Sample 5 thickness/flow; external sample/camera and processing documentation, not integrated into explorer catalogs |
| saffire2-psi-table | [`PSI-99_Experimental table_SAFFIRE-2.csv`](https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file=6792d000b7b6ff8e650380fc&version=1), version 1 | NASA PSI-99; row `2-5`, no pagination | Research-only experimental conditions; ambiguous thickness string retained without correction |

## Bhattacharjee 2016 investigation

Investigated: the opposed-flow radiative-extinction model, distinct from the 2003 API.
Verified: Eq. (2.5), printed p.28 of the NASA republication (PDF page 36), with
definitions and derivation on pp.26–27. Several documented inputs were located;
p.28 provides vaporization temperature and the numerical-model flame temperature.
Table 2.1 on p.28 reports theoretical critical flow velocities of **7.5 and 10 mm/s**
at the two oxygen conditions (**Published reference**, not project calculations).

Complete parameter-to-source traceability was insufficient to reproduce both values.
This is not experimental validation by this project. The 2016 model remains
unimplemented and may only be considered as a future parametric evaluator without
presets or assumed values. See [claim boundaries](scientific-limitations.md#bhattacharjee-2016-research-outcome).

## Urban 2019 audit provenance

The local `descompressed/urban2019.pdf` is absent. The publisher's accessible HTML
verifies Eq. (2) and the microgravity proportionality in Eq. (6), but does not
provide independently checked printed page numbers. The existing reference JSON
provides the prior transcription and page for the target results; the target
page could not be rechecked against a complete PDF during this audit.

NASA PSI sources were inspected in temporary files, including the Readme's
embedded Table 1 image and its page placement. No source files, scientific
constants, sample mappings or new published results were added to runtime data.
See [parameter inventory, source conflicts and independent calculation](urban-reproducibility-audit.md).
