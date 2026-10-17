# SAFFIRE-II Sample 5 / C2 validation audit

Date: 2026-10-17. **Acquisition and candidate image/telemetry registration completed;
quantitative 3D reconstruction remains blocked.** This supersedes the earlier
range-only inspection. Scope is exclusively Sample 5/C2 onboard JPEG products.

## Recovered evidence

Source: [NASA PSI-99](https://psi.nasa.gov/physci/repo/data/investigations/PSI-99).
The user authorized the approximately 57 MB minimum acquisition. The original
`descompressed/` directory is absent and was not created or modified. No complete
S5C2 ZIP or Urban PDF was found by filename searches under Desktop, Downloads,
Documents and temporary storage; external disks and team storage were not searched.
Temporary storage contained only archive ranges, three decoded frames, the complete
grid and documentation from the earlier audit.

| Official source, version 1 | Exact bytes | Recovery and integrity |
|---|---:|---|
| [SAFFIRE_II_S5C2_Image_Data_All_JPEGs_part1.zip](https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file=6840cdd74a0e24d624cebd8d&version=1) | 15,706,884 | Downloaded; all 5,000 JPEGs extracted and decoded; CRC passed |
| [SAFFIRE_II_S5C2_Image_Data_All_JPEGs_part2.zip](https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file=6840cdd74a0e24d624cebd8e&version=1) | 28,831,042 | Downloaded; all 4,600 JPEGs extracted and decoded; CRC passed |
| [Saffire Sensor Data Sample 5.xlsx](https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file=6840cdcb4a0e24d624cebd07&version=1) | 12,281,904 | Downloaded; complete workbook CRC passed; numeric cells extracted |
| [SAFFIRE-II_S5C2_DistortionGrids_Sample_ROI.zip](https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file=6840cdcb4a0e24d624cebd03&version=1) | 145,199 | Reused complete local copy; CRC passed; TIFF extracted and decoded |
| [SAFFIRE-II Readme.docx](https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file=6840cdd84a0e24d624cebd95&version=1) | 134,425 | Reused complete local copy; CRC passed |

The two ZIPs total **44,537,926 bytes**. Their complete downloaded sizes agree with
the NASA catalog; part 2 was also checked with HTTP `Content-Range`. A HEAD request
followed a GET-signed redirect and returned 403; bounded GET and full GET succeeded.
The new downloads total 56,819,830 bytes; the grid/document were reused. Full-file
SHA-256 values, versioned URLs and checks are in
[`data/processed/s5c2_validation.json`](../data/processed/s5c2_validation.json).
These locally computed hashes identify this acquisition; they are not NASA-published
checksums. No full mission archive, C1 data or other sample was downloaded.

Local files are under the existing Git-ignored `SAFFIRE-local-validation/`:

- `originals/`: complete downloaded/reused inputs, subsequently opened read-only.
- `frames/<archive-stem>/`: 9,600 original JPEG byte streams, separated by archive.
- `grid/`: original C2 grid TIFF.
- `derived/frames.csv`: filename IDs, archive/member, SHA-256, dimensions and
  candidate sensor-time registration for every frame.
- `derived/sensors.csv`: 11,363 timestamped rows, all 65 source columns, workbook,
  sheet and original spreadsheet row numbers; no resampling or formula evaluation.
- `derived/sensor_columns.json`: source headers/units and exclusion counts.
- `derived/audit.json`: reproducible numerical/integrity summary.
- `derived/contact-sheet.png`, `derived/led-review.png`: local visual review sheets
  assembled from unchanged image pixels; not physical measurements or runtime data.

Readme p.2 Table 2 explicitly maps S5C2 to Sample 5/camera 2; p.3 Table 4 identifies
these JPEGs as onboard/downlinked products, distinct from native sensor RAW,
Mapped JPEG, TIFF and ICMAD. The prior mapped part-1 catalog has the same 5,000 IDs,
but its image geometry and pixels were not substituted for the recovered originals.

## Extracted frames and sensor records

| Record | Count | First / last epoch-like ID | Span | Median / maximum interval |
|---|---:|---|---:|---:|
| JPEG part 1 | 5,000 | 1479775442720 / 1479775609340 | 166.620 s | 33 / 47 ms |
| JPEG part 2 | 4,600 | 1479775609373 / 1479775762661 | 153.288 s | 33 / 45 ms |
| Combined onboard JPEG | 9,600 | 1479775442720 / 1479775762661 | 319.941 s | 33 / 47 ms |
| Sensor rows 3–11365 | 11,363 | 1479775387709 / 1479775762655 | 374.946 s | 33 / 41 ms |

All images decode to **674 × 148 pixels**. The archive join is 33 ms. Both image
and sensor records have zero duplicate IDs and zero gaps over twice their own
median positive interval. This establishes archive coverage, not full-burn coverage
or independent delivery completeness. The received-image manifest was not retrieved.

The workbook's `Calibrated Data` sheet has headers on row 1 and units on row 2.
Its declared range reaches row 32601, but rows 11366–32601 have no epoch value:
**21,236 rows were excluded**, not turned into observations. Cached values and source
units are retained verbatim, including missing cells. The worksheet name does not
certify this project's calibration or every sensor's quality.

Recovered channels include CO2/O2 (F/G, `%`), anemometers (H/I, `cm/sec`), ambient
pressure (J, `PSIA`), radiometers (K–N, `mw/cm^2`), inlet/plume/sample temperatures
(P–AB, `Degrees C`), igniter current/voltage (AG/AH, `Amps`/`Volts`), electrical
controls and LED power. Channel labels do not establish sensor spatial locations,
response delays or which thermocouple measures a particular flame region.

## Temporal registration: what was checked

A4 explicitly contains `A3+(B4-B3)/1000`. Throughout all timestamped rows, cached
elapsed time agrees with `(epoch - 1479775387709)/1000` to a maximum numerical
residual of 4.56e-11 s. This is formula consistency, not timing precision.

| Event | Source cells / row | First sampled new state | Meaning |
|---|---|---:|---|
| C2 trigger rises | BE1670, B1670 | 1479775442720; elapsed 55.011 s | Exactly equals first JPEG ID |
| C2 trigger falls | BE1673 | elapsed 55.110 s | End of the initial pulse, not end of imaging |
| Igniter enable and select 5 rise | AR1822, AW1822 | 1479775447736; elapsed 60.027 s | Electrical command; **not optical ignition** |
| Igniter enable and select 5 fall | AR2099, AW2099 | 1479775456877; elapsed 69.168 s | Electrical command ends |

The electrical rising edge is bracketed by rows 1821–1822, epochs
1479775447703–1479775447736 (33 ms sampling bracket, excluding hardware latency).
The first image is **5.016 s before the first sampled electrical enable**.
Candidate transforms are:

- workbook coordinate: `(image_id - 1479775387709) / 1000` seconds;
- electrical-enable coordinate: `(image_id - 1479775447736) / 1000` seconds.

The maximum nearest-sensor timestamp distance is 17 ms. **This is not a measured
synchronization error:** dense sampling alone produces small nearest-neighbor
residuals. The final image is 6 ms beyond the final sensor timestamp and is flagged
outside coverage; it is not silently interpolated or treated as simultaneous.

Independent visual spot checks also compared green illumination with `BC` (`LED
Power 1`) at five times distributed across the record. The following images
visually show the respective on/off condition, matching the nearest telemetry row:

| On JPEG ID / BC row (state 1) | Off JPEG ID / BC row (state 0) |
|---|---|
| 1479775448820 / 1855 | 1479775449320 / 1870 |
| 1479775488803 / 3066 | 1479775489317 / 3082 |
| 1479775588801 / 6097 | 1479775589308 / 6112 |
| 1479775688800 / 9127 | 1479775689300 / 9142 |
| 1479775760794 / 11309 | 1479775761294 / 11324 |

These coarse checks support the candidate mapping from early to late acquisition.
They are not a pulse-edge fit or a quantified drift/latency bound. The C2 trigger
has only one rising pulse, so it supplies no second independent trigger anchor.
Clock semantics, exposure midpoint/duration, camera gain and capture latency need
source documentation and reviewed LED edge correspondences before certification.
Neither UTC nor the current renderer's virtual origin is verified.

**Optical ignition remains unset.** Event-centered images show changing illumination
and right-edge luminous signal, but reviewed frames do not establish the first
self-sustained gaseous flame separately from igniter emission and crop boundaries.
No brightness threshold was promoted into an ignition detector. Green LED light,
saturation and dark frames must be separated from flame/pyrolysis observations.

## Urban 2019 and verified parameters

The [publisher article](https://www.sciencedirect.com/science/article/pii/S0010218018304395)
remains a preview, without the target passage or a retrieved full PDF. The
[Edinburgh author record](https://www.research.ed.ac.uk/en/publications/flame-spread-effects-of-microgravity-and-scale/)
links to the publisher and DOI, with no downloadable manuscript. A renewed HAL API
query for `hal-02042950` returns an article record without `fileMain_s` or `files_s`.
Targeted repository searches did not locate a full copy of this exact article;
papers citing it are not substitutes. No author was contacted or purchase made.

Thus **neither exact Sample 5 `Vf` nor `lp` has been directly verified**, including
its printed page, definition, averaging window and uncertainty. The inherited
Published reference records remain unchanged in `scientific_reference_results.json`.
The NASA presentation is a different source and does not verify the exact pair.
The original PDF or an accessible author manuscript with locatable figures/text
is still required; a manuscript must not inherit guessed journal page numbers.

Verified here: file sizes, hashes, image dimensions/counts/continuity, numeric
sensor availability, elapsed-time arithmetic, electrical-event brackets and the
initial camera/image equality. Previously source-reviewed geometry/flow conditions
retain their provenance in the [parameter audit](urban-reproducibility-audit.md).
Their thickness conflict is unresolved; none supplies image calibration.

## Required calibration and correspondences

The recovered TIFF is
`SAFFIRE-II_S5C2_DistortionGrid-30mmBlock_674x148_color.tif`, also 674 × 148 pixels.
Readme p.3 describes these as preflight checkerboard distortion grids. The nominal
block size in the filename alone is insufficient for a validated metric transform.

| Requirement | Exact missing evidence / review |
|---|---|
| Grid physical coordinates | Confirm what `30mmBlock` measures, its uncertainty, grid plane and preflight-to-flight optical stability |
| C2 image formation | Intrinsics/lens distortion or documented mapping, full-sensor ROI/crop offsets, orientation and product-specific transforms |
| Pixel-to-sample correspondence | Reviewed grid intersections with physical coordinates, sample corners/visible bounds, longitudinal axis and origin in the same plane |
| Transform validation | Fit distortion/planar mapping with sufficient distributed controls; check held-out points, residuals and propagated uncertainties; explicit human review |
| Observable definition | Distinguish luminous flame front, pyrolysis front and burnout/base; `lp` is not automatically the luminous envelope length |
| Measurement series | Independent front/base annotations, timestamps, LED/exposure/occlusion flags, uncertainty and a predeclared steady interval |
| 3D comparison coordinates | Reviewed projection of the same planar observable into the renderer, spatial/time origins and a common camera view |

A single C2 view cannot uniquely recover volumetric flame depth. The defensible
first target is a calibrated planar front/base trajectory displayed in 3D with
its out-of-plane geometry explicitly schematic. A true volumetric reconstruction
needs additional geometric constraints or views, outside this C2-only scope.
Sample dimensions cannot be used to stretch an unverified crop into a scale.

## Comparison achieved and remaining gates

**Achieved:** original-image integrity/coverage checks, complete numeric telemetry
extraction, candidate timestamp pairing and qualitative LED/telemetry agreement.
**Not achieved:** a metric front/base trajectory, a reconstructed 3D flame, an
observed-versus-reconstructed residual, or a fidelity percentage. The report keeps
`trajectory` and `fidelity_error` null and calibration pending. No runtime API,
model, renderer or scientific reference value was changed.

Required next: original Urban passage; delivery manifest if full delivery is
claimed; reviewed timing edges and optical onset; C2 calibration/control points;
independent annotations and comparison tolerances. Published Vf/lp-driven animation
would be a reconstruction consistency check, not independent predictive validation.
The current steady schematic supplies no measured ignition/termination dynamics.

## Reproduction and verification

No dependencies were added. From the repository root:

```bash
uv run python -m pipeline.validate_s5c2 --root SAFFIRE-local-validation
# Optional NEW summary path; an existing file is refused to protect prior evidence:
uv run python -m pipeline.validate_s5c2 --root SAFFIRE-local-validation --summary /tmp/s5c2-review.json
uv run pytest -q
uv run ruff check pipeline backend tests
cd frontend && npm run lint && npm run build
```

Missing/invalid source files produce warnings and an unavailable/blocked report.
Existing runtime catalogs are never regenerated from this isolated acquisition.
Originals and full sensor/image exports stay ignored by Git; the small generated
summary is the review artifact. See [schemas](data-dictionary.md#s5c2-validation-audit)
and [lineage](data-lineage.md#focused-sample-5c2-extraction).

Verification: 217 Python tests passed, one existing raw-TIFF-dependent test skipped;
Ruff, frontend lint/build and whitespace checks passed. The six new synthetic tests
check source-cell preservation, sampled-event brackets, missing inputs, gaps,
variant isolation and refusal to infer physical validation. Existing warnings:
Starlette/httpx deprecation, Node 20.18.1 below Vite's supported version, and the
large Three.js bundle. Software checks do not establish experimental validation.
