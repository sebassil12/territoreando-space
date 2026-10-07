# Project context

## Challenge
NASA Space Apps Challenge 2026 — *Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data*.
The final official requirements are published on 28 October 2026; anything that depends on them is kept configurable
and is not assumed here.

## Investigation
Saffire-II (Spacecraft Fire Safety Experiment II), flown on the Cygnus vehicle during CRS OA-5 after it left the ISS.
It burned nine 29 cm × 5 cm samples in a flow tunnel, including SIBAL cotton-fiberglass fabric (Samples 5 and 6) and a
1-cm-thick PMMA slab (Sample 9). Source: `urban2019.pdf`, Section 2.2 (p.173).
The dataset label "PSI-99" comes from the challenge brief; `i_Investigation.txt` and `s_PSI-99-2.txt` are **not** in the
loaded sources.

## Goal
Help people explore microgravity combustion evidence: image sequences, their temporal continuity, calibration
resources and published findings — with every value traceable to a file.

## Scope
- In scope: evidence-exploration dashboard, normalized catalogs, pixel statistics, published reference values,
  a deterministic source-grounded assistant.
- Out of scope: CFD, physical simulation, fire-risk prediction, digital twin, temperature or heat-release inference.

## Users
Students, developers and people without aerospace training.

## Rules
1. Every scientific statement shown in the UI cites a source (file + page).
2. Observed data, derived image metrics, published results and interpretation are labeled separately.
3. Folder labels (S1…S9, F1, F2, C1, C2) are not interpreted as sample numbers or camera identities.
4. Original files in `descompressed/` are never modified.
