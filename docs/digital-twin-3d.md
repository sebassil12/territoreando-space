# Digital Twin: evidence playback and guided mathematical exploration

## SAFFIRE evidence playback

**IMPLEMENTED:** the initial Twin mode now offers source-cited SAFFIRE-1, SAFFIRE-3
and SAFFIRE-2 Sample 5 playback with timeline controls. Published steady inputs
(**EXPERIMENTAL**, inherited transcription) drive local front/base positions
(**DERIVED**). Flame and residue appearance are now **PHYSICALLY-INSPIRED**; transverse dimensions remain **SCHEMATIC**.
See the [procedural renderer classification](#procedural-combustion-renderer-implemented).
The original PDF was not independently reverified; no model is experimentally
**VALIDATED**. See [complete derivation, classifications and contract](saffire-playback.md).

Choose a case explicitly, inspect evidence, then play or scrub. Switching case or
mode resets playback. WebGL failure preserves metrics and evidence. The reusable
Three.js renderer now accepts a separate playback adapter; numerical model outputs
still cannot alter the mathematical illustration. Rendering follows timeline
updates only while playing, or user view/scrub changes; hidden tabs pause.

The sections below describe **Explore a mathematical model** mode.

## Status and user flow

**IMPLEMENTED:** a guided React experience at `#Twin`, a Three.js schematic,
orbital camera controls and existing dimensionless calculation.
**BLOCKED:** Bhattacharjee 2016 / Urban 2019 evaluators and unsupported physical outputs.
**PENDING:** source-backed dimensional/transient models and calibrated observation alignment.
**VALIDATED:** no physical model has experimental validation by this project.

The previous editor exposed model selection, all research parameters, conditions,
assumptions and evidence at once. The replacement starts with a choice of three
plain-language explorations. Each choice identifies its source, availability,
flow/gravity/thermal conditions and source assumptions. The selection notice
explicitly states that choosing the setup records those declarations as user
assumptions. Numeric fields are never populated, and an unspecified model gravity
regime remains unspecified. No scenario is selected on first load.

For `bhattacharjee2004_dimensionless`, the main form contains only `eta_g` and
`radiation_number`. Each has a plain-language name, scientific identifier, unit,
meaning and reason for inclusion. A short help panel explains that these are
explicit dimensionless assumptions, not automatically derived oxygen, material
or airflow values. Their definitions cite `20040053557.pdf`, Eq. (2), p.201;
the evaluated balance is Eq. (5), p.202. See [equation contract](dimensionless-model.md).

**Calculate my scenario** first assesses the current versioned scenario, then
uses that assessment's fingerprint to call the existing evaluator only when
eligible. Missing/incompatible inputs never trigger another model as a fallback.
The primary result presents `eta_f`, mathematical branch state, a plain-language
interpretation, `modelled_unvalidated` and the source alongside the central 3D.
No branch is interpreted as physical burning, extinction or reverse propagation.

**Advanced · scenario conditions** contains flow/gravity/thermal declarations, an
optional schematic shape category, source assumptions, and optional parameter
fields for the selected research model only. The UI does not ask for unused O₂,
pressure, material properties or dimensional geometry. The existing scenario
contracts still support this context for future model-specific interfaces.
**Scientific details** contains discriminant, exact backend blocker reports,
source locators, warnings, evaluator versions and complete provenance JSON.
Research-model selection assesses requirements automatically. Its main panel
explains why execution is blocked and lists missing parameters with units and
meaning; implementation/reproduction gates remain even if all numeric fields are supplied.

Every scenario edit clears prior assessment/results and cancels request ownership,
including an edit between assessment and evaluation. Switching models clears the
previous model's inputs and assumptions. Camera, illustrative orientation and
flame visibility controls affect presentation only; they do not alter the scenario
or invalidate a numerical result. These display settings are not scientific inputs.

## What drives the 3D

| Element | Classification | Input / boundary |
|---|---|---|
| `eta_f`, mathematical state and discriminant | **Calculated mathematics, outside the 3D scene** | Existing FastAPI evaluator, source-cited and experimentally unvalidated; no dimensional conversion |
| Airflow arrow direction | **Derived from declared scenario** | Opposed/concurrent relative to an assumed spread reference; arrows disappear for unknown direction; length, spacing and width are fixed display choices, not speed |
| Sheet/slab symbol selection | **Derived from declared scenario** | Optional shape declaration selects a generic mesh; absence shows a generic sample, without adding geometry to the scientific request |
| Gravity label | **Derived from declared scenario** | Displays microgravity or the actual declaration; absence remains unknown; no acceleration, buoyancy or trajectory simulation |
| Fuel mesh size and apparent thickness | **Schematic** | Fixed illustration units; no measured/calibrated length and no scaling from entered dimensions |
| Purple flame symbol | **Schematic** | Fixed geometry, color, opacity and location; not driven by `eta_f`, discriminant, branch state, O₂, flow speed, pressure, material or dimensions |
| White spread-reference arrow | **Schematic convention** | Defines the reference direction for opposing/concurrent airflow; no calculated propagation |
| Sample orientation control | **Presentation only** | Rotates sample, flame symbol and relative-direction arrows together; no new physical orientation contract or gravity relation |
| Orbital camera, lighting and surrounding frame | **Presentation only** | User view controls and fixed display settings; no spacecraft dimensions, experimental camera mapping or physical illumination |

**In mathematical mode, no experimental measurements drive the scene and no spatial
quantity is physically calculated.** The purple wireframe is deliberately marked as an
illustrative flame even before a calculation and also when the equation has no
real branch. This conveys no claim that a physical flame exists. It can be hidden.
There is no flicker, moving particle field, fire-growth animation, temperature
color scale or time axis. Static cyan arrows indicate direction only.

The microgravity setup is illustrated by an isolated sample and a context label;
there is no floor, falling motion or gravity solver. The illustration must not be
used as evidence about a physical flame's microgravity shape.

## Technology and lifecycle

Dependency inspection found React 19 and React DOM, with no existing 3D library.
The increment adds `three` and development-only `@types/three`, with versions
recorded in `frontend/package-lock.json`. Direct React lifecycle integration avoids
an additional renderer abstraction for this small, demand-rendered scene.
[Three.js OrbitControls](https://threejs.org/docs/pages/OrbitControls.html) provides
mouse/touch orbit and zoom; labelled buttons also support keyboard operation.

The WebGL code is lazy-loaded separately from the explorer. Rendering happens on
camera/presentation changes and resize, without a physical animation loop. Pixel
ratio is capped for rendering cost; this is a display setting, not scientific data.
Unmount disposes controls, observers, geometry, materials and the renderer.
WebGL initialization failure/context loss shows a clear fallback and leaves
calculation/evidence available. A WebGL retry control is provided.

`guidedScenario.ts` provides explicit setup selection and the narrow scene
adapter. The adapter exposes only flow, gravity label and shape category.
`scene/sceneObjects.ts` builds the illustrative geometry and cannot receive model
results. `scene/createScene.ts` owns GPU resources and orbital controls.
`ScenarioScene.tsx` owns display-only orientation/visibility and the persistent
schematic legend. Existing physical engines are unchanged; separate FastAPI playback routes serve the evidence-derived anchors.

## Verification and next scientific increment

Focused tests cover explicit setup provenance with no numeric defaults, selected
model serialization, lack of numeric dependencies in the scene, unchanged flame
geometry/color across flow changes, missing-flow arrows, mathematical branch
rendering and request invalidation. Python consumer tests send requests generated
by the actual guided TypeScript builder through FastAPI. Browser checks exercise
the two-input flow, camera movement, real/no-real mathematical outcomes, late
responses, blocked Urban evidence, narrow-screen layout and WebGL loss.
These are software checks, not experimental validation.

To make flame appearance respond physically, first define a source-backed model
that actually predicts the intended spatial/time-dependent observable. It needs
complete parameter values, units, source pages, initial/boundary conditions,
material/geometry conventions, applicability limits and a reproducible benchmark.
Specify outputs with units, timestamps, coordinate frame, uncertainty and provenance,
then verify a visual mapping that consumes only those outputs. An absolute spread
speed alone does not provide flame shape, color or temperature. Comparison against
observations additionally requires documented sample/sequence mapping, continuous
timing, matching processing variants and manually validated spatial calibration.

## Procedural combustion renderer (implemented)

SAFFIRE playback now uses a GPU volume instead of the purple prism. Mathematical
exploration retains its static schematic symbol. Existing Three.js dependencies
are reused, without a particle framework or CFD engine.

`playback/fire/shaders.ts` defines artistic density, palette and surface shaders;
`fire/volume.ts` owns materials and the background pass. The volume uses 40 bounded
ray samples per fragment, smooth support at both longitudinal ends, advected noise,
a warm core and a translucent outer envelope. The proxy box only bounds ray
integration: no box faces, wireframe or rectangular flame surfaces are displayed.
The volume is centered at `(x_base + x_front) / 2` and its full longitudinal support
is `l_p`. Opacity fades inside those boundaries; no flame emission or procedural
noise expands the longitudinal support outside the pyrolysis interval.

Noise is advected along the signed airflow axis with zero imposed vertical drift.
Transverse fluctuations wrap around both faces of the strip; no gravity/upward
acceleration or buoyancy term is introduced. Visual advection frequency is an art
setting, **not** a conversion of tunnel airflow speed to gas velocity. The inherited
flow condition is displayed with its source and page; its numeric magnitude does
not drive turbulence or flame height. Only the documented direction drives the
visual flow orientation. Missing/unsupported airflow context blocks the case.

The sample shader blends a procedural virgin weave, a dark active strip with
subtle glow, and a cracked-looking residue behind `x_base`. This is a visual
consumption proxy, not mass loss, chemical conversion or measured char texture.
No detached incandescent particles are emitted: there is no source-backed reason
to portray spark shedding from these cases. Subtle heat-like distortion samples
an offscreen background with a procedural displacement; it is not a refractive
index/temperature calculation. A depth texture prevents the flame being drawn
through the opaque sample when orbiting.

| Category | Exact content |
|---|---|
| **EXPERIMENTAL** | Published reference Vf/lp and airflow context, inherited source/file/page transcription; not newly reverified measurements |
| **DERIVED** | Local steady-window time, x_front, x_base, constant l_p and common longitudinal display span |
| **PHYSICS-DRIVEN** | Renderer placement and longitudinal support from those derived coordinates, motion rate from Vf, and flow direction from documented case context; this label does not promote the reconstruction to a validated simulation |
| **PHYSICALLY-INSPIRED** | Instantaneous density/shape, core/envelope, noise, transverse fluctuations, opacity, intensity, palette, surface glow/residue texture and background distortion |
| **SCHEMATIC** | Transverse dimensions, apparent thickness, generic fabric pattern, camera, lighting, arrow scale and local view instead of full sample geometry |

The main viewport prioritizes the flame, with a short inspired-appearance badge.
Vf/lp, airflow condition and SAFFIRE citation remain visible beside the scene.
Play/Pause, Reset, timeline, 0.25x/0.5x/1x/2x playback speed and OrbitControls are
available. Speed changes alter the playback clock, never the published Vf. The
same local time controls noise and kinematics: Pause freezes both, seek is
repeatable and Reset restores the same visual state. Scientific details retains
quality, provenance, source-review limitations, formulas and numeric positions.

### Performance and verification

There is one volume and one material surface, with a constant small number of
markers/arrows; no per-particle meshes or allocations per integration step.
Rendering is demand-driven by playback, view controls or resize; paused/hidden
playback does not run an independent animation loop. Pixel ratio is capped at
1.5 for this mode. One background/depth pass uses 65% drawing-buffer resolution;
all render targets, depth textures, materials and geometry are disposed on
unmount. WebGL loss retains controls/evidence and permits retry.

Tests check the actual volume support, surface thresholds, time uniforms, direction
mapping, absent-flow rejection and playback-rate semantics. Browser verification
must check GLSL compilation (TypeScript build alone cannot check shader syntax),
visible render output, pause/seek/reset, speed choices, orbital depth occlusion,
mobile layout and context recovery. These are software/visual checks, not physical
validation or a cross-device frame-rate guarantee.

Implementation references: [Three.js ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html)
and [RenderTarget](https://threejs.org/docs/pages/RenderTarget.html). No scientific
parameters were obtained from graphics documentation.

### What is still needed for quantitative flame appearance

Obtain independently reviewed, calibrated spatial/temporal flame observations,
uncertainties and matching experiment/camera conditions. Temperature needs an
appropriate validated diagnostic or predictive model with complete thermal,
chemical, radiative and transport inputs. Predicting observed color also needs
spectral emission/absorption and instrument response/exposure calibration.
Vf/lp and a procedural palette provide none of these. The current renderer does
not supply a temperature scale, oxygen response, extinction inference or a
quantitative turbulent-flow solution. Urban/2016 evaluators remain blocked.

Verification for this increment: 205 Python tests passed (one raw-asset test
skipped), 13 frontend tests passed, Ruff/lint/build and diff whitespace checks
passed. Chrome/WebGL checks passed shader compilation, all three cases, four
playback speeds, pixel-identical paused viewport captures, case/mode reset,
mobile layout and WebGL fallback. The mathematical mode passed its existing
browser regression. The checks used a local Chrome software WebGL backend;
performance on mobile GPUs still needs device testing. Existing Node-version
and lazy-bundle-size build warnings remain documented in the playback guide.

## NASA Evidence Replay

The [comparison mode](nasa-evidence-replay.md) reuses `SceneCanvas` with a generic
support and the flame hidden. It receives no published numeric quantities,
trajectory or image clock while exact reference pairs and registration are
unverified. Camera controls remain presentation-only. The other two Twin modes
retain their existing behavior and scientific boundaries.
