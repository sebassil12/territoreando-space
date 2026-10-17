# SAFFIRE published-reference playback

## Status and evidence

**IMPLEMENTED:** independent data-driven playback at `#Twin`, case selection,
play/pause/reset/scrubbing, derived longitudinal Three.js motion, source/quality
panels and graceful unavailable cases. **EXPERIMENTAL:** the published steady
reference inputs, not the generated frames. **DERIVED:** all timeline positions.
**PHYSICALLY-INSPIRED:** procedural flame and residue appearance.
**SCHEMATIC:** transverse geometry and visual scale conventions.
**VALIDATED:** no experimental model validation by this project.

The sole numeric source is `data/scientific_reference_results.json`. The manifest
`playback_cases` references existing records by ID; no science presets are added
to the Scenario Engine. Supported concurrent-flow cases are:

| Case | Speed reference ID | Pyrolysis reference ID | Inherited source locator |
|---|---|---|---|
| SAFFIRE-1 | saffire1-spread-rate | saffire1-pyrolysis-length | descompressed/urban2019.pdf, p.175 |
| SAFFIRE-3 | saffire3-spread-rate | saffire3-pyrolysis-length | descompressed/urban2019.pdf, p.175 |
| SAFFIRE-2 Sample 5 | saffire2-s5-spread-rate | saffire2-s5-pyrolysis-length | descompressed/urban2019.pdf, p.177 |

These values and pages are **inherited transcriptions, not independently reverified
for this increment**. The original article PDF is unavailable in this checkout.
SAFFIRE-3 length was already explicit in the spread-rate record's notes; the new
numeric record structures that same statement and preserves `transcribed_from`.
It is not a newly verified measurement. No uncertainty is invented. The UI shows
original units, source file/page, DOI and this source-review limitation.

There is no traceable numeric time series in the repository. Published trajectory
plots exist in the NASA Saffire presentation (see [sources](sources.md#saffire-playback-source-review)),
but they have not been digitized into reviewed, timestamped data. Its differently
rounded rates are not substituted into the Urban reference pairs. No image sequence
or temporal gap is used to generate this playback. The Urban analytical evaluator
remains **BLOCKED**: consuming its publication's measured outputs does not reproduce
its equation, solve missing thermal inputs or validate its predictions.

## Explicit kinematic derivation

Convert the cited pyrolysis length to millimetres and use the cited spread rate
in mm/s. Define a **local steady window**, with trailing boundary at position zero
at virtual time zero:

```text
l_p(t) = lp
x_front(t) = lp + Vf * t
x_base(t) = x_front(t) - l_p(t) = Vf * t
0 <= t <= T, where T = lp / Vf
```

Time zero is not ignition, and position zero is not an absolute sample edge.
`T` is the chosen display window for one length transit, not an experimentally
observed steady interval or total burn duration. Constant speed/length extend a
steady reference locally; no intermediate frames are labelled measurements.
The local window avoids depicting ignition, overshoot, sample-end effects or an
entire burn. Neither the sampling frequency nor decimal display precision implies
experimental precision. Pyrolysis-front motion is not a measured luminous-flame
boundary. `x_base` denotes the trailing pyrolysis boundary; the area preceding it
is only a traversed-region proxy.

The backend emits two **derived** anchors, not fabricated experimental samples.
The frontend linearly interpolates these anchors and recomputes `x_base` from
front minus length. A common longitudinal view span is the largest `2 * lp`
among available cases. This permits consistent longitudinal scale across cases
without assigning an invented physical width, sample length or camera calibration.

## API and failure behavior

- `GET /api/twin/playback-cases`: version `1`, `cases` catalog.
- `GET /api/twin/playback-cases/{case_id}`: one case; unknown IDs return 404.
- Both use `{data, source, warnings, quality}`. Available quality is
  `derived_from_published_reference`, never `modelled_validated` or a probability.
- Each case carries `case_id`, `label`, `status`, `quality`, `source_review`,
  `time_series_status`, `evidence`, `trajectory`, `warnings`, `missing_requirements`.
- `evidence.vf` / `.lp` include the reference ID, Published reference label,
  experimental classification, value, unit, file, page, URL, original notes and
  transcription lineage. `trajectory` declares kind/classification, coordinate
  and time origins, formulas, units, bounds and derived anchors.

`backend/playback.py` resolves references at application startup. Positive finite
values, permitted units, unique reference IDs, source file/page and matching
experiment labels are required. A missing or invalid required reference makes
that case unavailable, with no fallback or guessed value. A missing reference
file yields an empty unavailable catalog. No raw files are modified or parsed
by requests. Existing findings/model/scenario endpoints remain independent.

## Interaction and visual mapping

Choose **SAFFIRE evidence playback**, then an explicit case. No case starts by
default and playback never autostarts. Scrubbing pauses; reset returns to local
zero; reaching the end stops, with Replay available. Switching case/mode unmounts
the old player and clears its timeline. Hidden tabs pause. Orbital controls do not
change scientific data. WebGL failure leaves evidence, metrics and timeline usable.

| Element | What governs it | Classification / limit |
|---|---|---|
| Green front and amber trailing marker | x_front and x_base in derived mm | DERIVED; not tracked video positions |
| Procedural volume longitudinal support | interval [x_base, x_front] | PHYSICS-DRIVEN placement; PHYSICALLY-INSPIRED shape, not measured gas-phase flame length |
| Growing dark surface | interval [0, x_base] | PHYSICS-DRIVEN extent, PHYSICALLY-INSPIRED residue; not measured char area, mass loss or chemistry |
| Fuel strip longitudinal view | shared local coordinate window | DERIVED display extent; not full sample dimensions |
| Fuel width/thickness and flame transverse extent | fixed illustration settings | SCHEMATIC dimensions |
| Flame color/opacity and fluctuations | procedural shader | PHYSICALLY-INSPIRED; no temperature or heat-release calculation |
| Cyan arrow and microgravity context | selected concurrent SAFFIRE case | Experimental context; arrow magnitude and scene orientation are display choices |
| Camera, lighting, surrounding frame | user controls / fixed rendering | PRESENTATION; no experiment-camera mapping |

The envelope moves at constant longitudinal length in this increment because all
supported lengths are steady values. A time-varying length is not invented.
No CFD, oxygen sensitivity, pressure/material interpolation, extinction inference
or general physical simulation is introduced. The new procedural motion/opacity
variation is visual only; see [renderer classification](digital-twin-3d.md#procedural-combustion-renderer-implemented). The mathematical mode
retains `modelled_unvalidated` and its fixed schematic flame.

## Verification and next increment

Software tests cover unit conversion, steady anchor bounds, reference provenance,
missing/ambiguous/invalid evidence, unavailable catalogs, endpoint envelopes and
actual Three.js mesh mappings. Browser checks cover playback controls, case reset,
mode isolation, end bounds, WebGL fallback and responsive layout. These checks do
not establish physical validation.

**PENDING:** obtain and independently review the original source and traceable
front/base time series with timestamps, coordinate origins, uncertainty and
experimental sample mapping. Then add a measured-series contract with explicit
gaps and validated spatial/temporal registration. Predictive flame geometry needs
additional measured observables or a reproducible dimensional/transient model
with complete initial/boundary conditions; Vf and lp alone cannot provide it.

Verification run: 205 Python tests passed, one raw-asset-dependent test skipped;
13 frontend tests passed; Ruff, frontend lint/build and `git diff --check` passed.
Local Chrome checks exercised all three cases, source/quality display, seek,
play/pause/reset/end, mode isolation, mobile layout and WebGL loss. The existing
mathematical flow also passed its browser regression. Build warnings remain for
Node 20.18.1 below Vite's supported minimum and the lazy Three.js bundle size;
they are tooling/performance limitations, not scientific validation.

## Procedural renderer integration

The case manifest now explicitly declares `airflow_direction: concurrent`. The
API exposes `airflow` with direction, original condition text and reference/file/page
lineage; missing/unsupported direction or missing condition makes playback unavailable.
No numeric flow conversion or new measured value is introduced. Scientific details
retains the full envelope and source limitations. Playback speed changes the local
clock only; the published spread rate, anchors and quality remain unchanged.
See [visual mapping and resource lifecycle](digital-twin-3d.md#procedural-combustion-renderer-implemented).

## Separate NASA Evidence Replay mode

[NASA Evidence Replay](nasa-evidence-replay.md) adds a source-frame comparison and
an explicit audit of the inherited pairs. The original Urban PDF remains
unavailable, so the new comparison does not animate these values. Its independent
image index does not synchronize with this playback's local clock. Source-checked
sample geometry is displayed as reference context only. The existing derived
playback and its controls remain available without a claim of physical validation.
