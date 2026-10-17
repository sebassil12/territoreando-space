# SAFFIRE-II first experimental comparison audit

Date: 2026-10-17. Scope: read-only source investigation; documentation changes
only. **Candidate: Sample 5, camera C2. Not ready for experimental validation.**
It has enough identifiable evidence to begin registration/calibration work, but
full-burn observability and a comparable 3D prediction are not established.

## Source acquisition and local availability

Start with [NASA PSI-99](https://psi.nasa.gov/physci/repo/data/investigations/PSI-99),
Raw Data and Science Documents. Versioned download links below resolve to NASA's
storage; retain these links, not expiring signed redirects. Archive names below
omit the common `PSI-99_Raw Data_` prefix.

| File, version 1 | Catalog size | Audit / priority |
|---|---:|---|
| [SAFFIRE_II_S5C2_Image_Data_All_JPEGs_part1.zip](https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file=6840cdd74a0e24d624cebd8d&version=1) | 15,706,884 bytes | Central directory checked; two actual JPEG entries decoded and CRC-checked |
| [SAFFIRE_II_S5C2_Image_Data_All_JPEGs_part2.zip](https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file=6840cdd74a0e24d624cebd8e&version=1) | 28,831,042 bytes | Central directory checked; last JPEG decoded and CRC-checked |
| [SAFFIRE-II_S5C2_DistortionGrids_Sample_ROI.zip](https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file=6840cdcb4a0e24d624cebd03&version=1) | 145,199 bytes | Small archive inspected in full; grid TIFF is 674 × 148 pixels |
| [Saffire Sensor Data Sample 5.xlsx](https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file=6840cdcb4a0e24d624cebd07&version=1) | 12,281,904 bytes | Bounded ZIP/XML ranges inspected: workbook, strings and first 2,362 data rows |
| [SAFFIRE-II_MergeResult-jpeg_v5_Final.xlsx](https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file=6840cdd64a0e24d624cebd82&version=1) | 20,820,425 bytes | Identified in prior PSI inventory; not downloaded in this audit; needed for delivery completeness |
| [SAFFIRE-II Readme.docx](https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file=6840cdd84a0e24d624cebd95&version=1) | 134,425 bytes | Previously retrieved original reused; p.2 Table 2 maps sample/camera, p.3 Table 4 defines image products |

The Readme identifies JPEGs as created onboard and downlinked. They are source
JPEG products, not native sensor RAW. Mapped JPEG, TIFF and ICMAD products must
remain separate. C1 JPEG parts are also listed in the prior PSI inventory (IDs
`6840cdd74a0e24d624cebd87` and `6840cdd74a0e24d624cebd88`, version 1); their content
was not inspected. Obtain C1 only if documented fields of view require it to
observe the complete front/base path. Do not substitute it for missing C2 frames.

The documented local source is `SAFIRE-II Project.zip` in team shared storage,
extracted to `./descompressed/`, or an explicit `SAFFIRE_RAW_DIR`. No shared-storage
URL is documented. The environment variable is unset and the default directory
is absent. Targeted filename searches under Desktop and Downloads found no
original Urban PDF, project archive or matching S5C2 JPEGs. This is not an
exhaustive search of external disks or team storage. Existing `/private/tmp/`
research documents were reused; rendered twin screenshots are not NASA evidence.

Only about 4.7 MB of bounded source ranges, three JPEG entries and the small grid
were retrieved into temporary storage. Neither complete image archive nor the
complete sensor workbook was downloaded. No raw files or reference values were
added to the repository.

## Verified sample, frame and time chain

1. NASA Readme p.2 Table 2 identifies S5C2 as Sample 5, camera 2. Archive entries
   explicitly use `S5C2-<identifier>.jpeg`. Folder-to-record association remains
   the documented shared-label mapping, not a material inference from pixels.
2. Part 1 lists 5,000 JPEGs, IDs `1479775442720`–`1479775609340`; part 2 lists
   4,600, IDs `1479775609373`–`1479775762661`. The join interval is 33 ms.
   Each part has a 33 ms median; maximum intervals are 47 and 45 ms, respectively.
   Neither has duplicate IDs or gaps exceeding twice its median. Combined
   filename coverage is 319.941 s, **not an asserted burn duration**. These are
   archive-directory checks; all images have not been decoded or inventoried locally.
3. All 5,000 part-1 IDs exactly match the existing
   `S5-C2-mapped-jpeg-part1` frame catalog. This verifies identifier correspondence,
   not pixel equivalence or calibration between raw and mapped products.
4. The sensor workbook's **Calibrated Data** sheet has `Elapsed Time (s)` (A),
   `Epoch Time` (B), a formatted date/time column (C), igniter current/voltage
   (AG/AH), `Igniter Power Enable` (AR), `Igniter Select 5` (AW), and camera
   triggers (BD/BE). Sheet name alone does not validate any project calibration.
5. Row 3 starts at elapsed zero with epoch `1479775387709`. Cell A4 explicitly
   uses `A3+(B4-B3)/1000`; elapsed/epoch differences agree to floating-point
   tolerance throughout the inspected prefix (through elapsed 77.913 s).
   Row 1670 has epoch `1479775442720`, elapsed 55.011 s, and both camera
   triggers transition to 1: **an exact match to the first C2 JPEG identifier**.
6. AR and AW first transition from 0 to 1 at row 1822, epoch `1479775447736`,
   elapsed 60.027 s; they return to 0 at row 2099, elapsed 69.168 s.
   The first JPEG therefore precedes the first sampled electrical enable by
   5.016 s. This is a derived event offset, not measured optical ignition delay.

A candidate registration is `(image_id - 1479775447736) / 1000` seconds relative
to that **sampled electrical-enable event**, or `(image_id - 1479775387709) / 1000`
relative to workbook elapsed zero. These transformations are supported at the
start event only; check later shared events, clock drift, timestamp semantics,
exposure timing and acquisition latency before accepting the entire sequence.
Do not call the formatted timestamps verified UTC without clock documentation.
The optical ignition onset, positional origin and start of a steady regime remain
unverified. The current 3D's virtual time zero is none of these events.

The three decoded source images (first, part-1 index 2500, and last) are 674 × 148
pixels and mostly dark, with sparse visible signal in the middle example. They
do not establish a measurable full-burn flame boundary. Inspect exposure/LED
cycles and event-centered frames before deciding whether front/base tracking is feasible.

## Published quantities and spatial calibration

The original target remains [Urban et al. (2019)](https://doi.org/10.1016/j.combustflame.2018.10.012).
The original full PDF was not found locally; publisher retrieval returned 403,
and the indexed publisher preview does not expose the target result passage.
The existing Sample 5 `Vf` and `lp` records, including inherited p.177, therefore
remain **unverified exact transcriptions**. No values or pagination were corrected.
A source owner/library copy or author-provided manuscript with verifiable page
mapping is the minimal next step; do not fit a value from a plot to fill this gap.

The original [NASA presentation, 20180005168.pdf](https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf),
p.30 Table 1 row II-5, supports the sample length/width already held in the
reference JSON. Its p.31 reports a differently rounded spread-rate figure;
it does not verify the exact Urban pair. Published quantities remain owned by
`data/scientific_reference_results.json`, not new audit presets. Thickness is
also unresolved across the Readme and NASA presentation (see the earlier
[parameter/source-conflict audit](urban-reproducibility-audit.md)); planar geometry
agreement must not be described as verification of the full 3D sample geometry.

The grid entry is `SAFFIRE-II_S5C2_DistortionGrid-30mmBlock_674x148_color.tif`.
Its image was inspected. The filename identifies a nominal block size; it does
not establish a validated scale. Required: documented block-size meaning,
raw-image ROI/crop and lens mapping, matching optical plane, sample corners and
longitudinal axis, camera orientation, raw-versus-mapped transformation, and
independent residual/uncertainty checks. Do not use sample dimensions alone to
rescale a crop. No pixel-to-mm measurement or automatic calibration was performed.

## Minimal validation plan and decision gates

1. Recover the original Urban paper and verify both exact quantities, definitions,
   averaging interval and geometry/uncertainty. Preserve conflicts separately.
2. After those checks, retrieve only the two C2 JPEG parts, matching grid and
   Sample 5 sensor workbook. Check full-archive hashes/CRC, manifest completeness,
   decoding, missing frames, and optical coverage from before ignition through
   termination. Add C1 only if the full path is outside C2's documented view.
3. Review the electrical timestamp bridge against camera/igniter telemetry and
   optical onset. Establish explicit event definitions, exposure/clock uncertainty,
   and registration across the whole record; never equate first frame with ignition.
4. Manually validate the camera/ROI-specific spatial transform. Independently
   annotate pyrolysis front/base on suitable illuminated frames, with uncertainties
   and exclusion flags for gaps/occlusion. A luminous envelope is not `lp`.
5. Predeclare a held-out, observed steady interval and compare registered front,
   base and length in common units, with uncertainty-based acceptance criteria.
   If published `Vf`/`lp` drive the animation, matching them is a reconstruction
   consistency check, **not independent validation of predictive physics**.
6. Keep whole-burn and steady-window results separate. The current 3D implements
   only a virtual constant-speed window, without ignition or termination dynamics.
   Acquiring a complete experiment cannot make that renderer a whole-burn model.
   Full-burn predictive validation needs a separately justified transient capability;
   it is outside this audit and is not implemented.

**Decision:** a promising C2 acquisition and an exact initial telemetry bridge
are identified. Synchronizing the existing 3D and claiming full experimental
validation remain blocked by source review, spatial calibration, full-record
clock/coverage checks, independent measurements and model scope.
