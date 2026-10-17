# NASA Evidence Replay

## Implemented comparison

Open **Digital Twin → NASA Evidence Replay** and choose a case. The left panel
browses supplied NASA frames; the right reuses the existing Three.js renderer.
Camera and processing variant are selected explicitly and never concatenated.
The image slider addresses actual catalog entries, displaying their filename ID,
sequence-relative timestamp, source path, gaps, calibration status and stored
pixel metrics. It fetches one frame at a time. Case/sequence changes reset the
selection; cancellation prevents an older response from replacing current evidence.
The original Viewer link, published-reference playback and Scenario Builder remain available.

**Current right-panel status: schematic only.** Exact published `Vf`/`lp` pairs
could not be independently verified in the original Urban PDF. The new comparison
therefore supplies no quantities, timeline or flame to the renderer. Its generic
support, camera, scale, lighting and orientation are presentation choices. The
older playback retains its explicitly unverified inherited transcriptions and
local kinematics; it is a separate mode, not a validated reconstruction.

There is **no synchronized timeline or numerical fidelity score**. This is a
scientific limitation of the loaded evidence, not an inferred zero error. No
automatic registration, time-origin offset, curve digitization, CFD, physics,
calibration validation or dependencies were added.

## Evidence audit (2026-10-17)

The checkout has 21 sequence records and 69,380 frame records. The default
`descompressed/` directory and original Urban PDF are absent; catalog
`availability` is historical, not proof of current local image availability.
The backend checks actual file presence at startup and checks each selected image
again through the existing frame endpoint. Restore the raw directory or configure
`SAFFIRE_RAW_DIR` to see source images. No synthetic replacement is displayed.

| Case | Image catalog | Exact Urban Vf/lp pair | Sample geometry |
|---|---|---|---|
| SAFFIRE-1 | None in loaded catalogs | Unverified original, inherited p.175 | Source checked, NASA presentation p.30, row I-1 |
| SAFFIRE-3 | None in loaded catalogs | Unverified original, inherited p.175 | Source checked, NASA presentation p.30, row III-1 |
| SAFFIRE-2 Sample 5 | Three C2 sequences | Unverified original, inherited p.177 | Source checked, NASA presentation p.30, row II-5 |

The [NASA presentation](https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf)
was inspected: p.30 documents sample geometry; p.31 reports spread rates with
figures different from the exact Urban transcriptions. Those rates are not
substituted into existing `Vf`/`lp` pairs. Pyrolysis-length/position plots on p.17
are not a reviewed numeric trajectory. The original Urban PDF remains unavailable;
source comparison does not verify its exact values or page placement. Source
checking is not independent experimental validation.

The NASA PSI-99 Readme, version 1 (file and download in [sources](sources.md)),
p.2 Table 2 documents sample/camera records, including S5C1 and S5C2. Local folder
association uses the shared label, consistent with the existing DoD mapping.
Its p.3 Table 4 distinguishes mapped images, ICMAD annotations and raw products.
The loaded Sample 5 catalog contains:

| Sequence | Entries | Relative span | Gaps over twice median | Maximum interval |
|---|---:|---:|---:|---:|
| S5-C2-mapped-jpeg-part1 | 5,000 | 166.620 s | 0 | 47 ms |
| S5-C2-icmad-png-part1 | 5,000 | 166.620 s | 0 | 47 ms |
| S5-C2-mapped-tiff-single | 981 | 315.788 s | 3 | 157,454 ms |

These numbers describe the committed catalogs, not full-burn coverage or files
currently present. No untouched camera-original Sample 5 sequence is cataloged.
TIFF is converted to PNG by the existing endpoint for browser display. All 19
calibration records are pending; a distortion grid is not validated calibration.

`time_s = (raw_id - first_raw_id) / 1000` is the pipeline's filename-relative
coordinate. Neither its numeric appearance nor a continuous sequence verifies
UTC, ignition time, the local steady-window origin, or registration to a measured
front/base trajectory. The image index never drives the 3D. Gap warnings remain
visible and no rate is derived across missing observations.

## API and provenance

`GET /api/twin/evidence-replay` returns the usual `{data, source, warnings, quality}`
envelope. Catalog schema version is `1`; quality is `qualitative_only`, or
`unavailable` when no reference cases are loaded. Application startup composes
references and processed catalogs; requests do not generate scientific data.
Injectable `processed`, `raw` and `references` paths are preserved.

Each case includes:

- `reference_evidence`: original published-reference quantities and citations,
  retained for audit only; not renderer inputs.
- `reference_audit`: unresolved exact-pair status and comparison source/page.
- `geometry`: source-checked sample dimensions, citation and explicit absence of
  camera calibration; no renderer sizing follows from these dimensions.
- `image_mapping`: documented group/cameras with file/page, or null.
- `sequences`: existing sequence metadata plus `catalog_frame_count`,
  `local_frame_count`, `asset_status`, `availability_basis` and `timestamp_basis`.
  Filesystem counts are snapshots; a path existing does not establish decodability.
- `synchronization`: `enabled=false`, `status=unavailable`, `time_transform=null`.
- `reconstruction`: `status=schematic_only`, `trajectory=null`, `fidelity_error=null`.

Missing catalogs/references return empty evidence with warnings. Missing citation
metadata cannot establish a geometry or image mapping. Missing or unreadable
images retain metadata and show an explicit unavailable state. Source images are
never replaced by generated imagery or a different flight/sample. A metadata edit
or a nominally validated calibration cannot automatically enable synchronization.

## Requirements still outstanding

Obtain the original publication and review each exact quantity and page. Obtain
matching measured front/base coordinates, timestamps, uncertainties and a
reviewed transformation between observation and reconstruction origins. Validate
camera geometry and processing-specific calibration with documented review.
Define comparable observables and acceptable error before computing fidelity.
A steady reference-derived animation cannot independently validate the same
reference from which it was constructed.

Tests exercise source lineage, missing catalogs/references/assets, file restoration,
variant isolation, gap metadata, citation failure and refusal to infer registration.
Frontend checks exercise audit labels, absence states and request cancellation.
These are software checks, not scientific validation.

## Software verification

211 Python tests passed; one raw-TIFF-dependent test was skipped because local
raw data is absent. All 16 frontend tests, Ruff, frontend lint/build and whitespace
checks passed. Chrome software-WebGL checks covered desktop comparison, missing
assets, image seek, variant gap display, case reset, mobile overflow, context-loss
fallback, existing playback and mode isolation. This does not verify real source
image appearance in this checkout or mobile-GPU performance.

Existing environment warnings remain: Node 20.18.1 is below Vite's supported
minimum, the lazy Three.js chunk exceeds the bundle-size warning threshold, and
Starlette warns about its existing httpx test-client integration. No dependency
changes were made in this increment.


## Follow-up validation audit

The [first experimental-comparison audit](saffire2-validation-audit.md) located
the missing original C2 JPEG parts and Sample 5 telemetry in PSI-99. Bounded
inspection verifies an initial image/trigger timestamp bridge and identifies the
electrical-enable event. Full-record registration, optical ignition, calibration
and exact Urban references remain unresolved. These external audit findings are
not imported into runtime data; the current schematic-only comparison and disabled
synchronization remain correct. See the audit for the minimal acquisition plan.
