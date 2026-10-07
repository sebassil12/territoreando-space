# Scientific limitations

What the dashboard **cannot** conclude, and why.

| Claim | Status | Reason |
|---|---|---|
| Flame temperature, heat-release rate | Not available | Images have no radiometric calibration. Brightness ≠ temperature. |
| Fire risk for a material or spacecraft | Not available | Published results apply only to their tested conditions (urban2019 §6, finding 6). |
| Oxygen concentration from images | Not available | Test conditions come only from the paper. |
| Which sample/material a folder shows | Not available | No loaded source maps S1…S9 / F1 / F2 to Saffire-2 sample numbers. |
| C1 / C2 = camera 1 / camera 2 | Candidate interpretation | Plausible (paper: two cameras) but not documented. |
| Lengths in mm / cm, spread rates | Not available | Distortion grids exist (30 mm block) but no pixel→mm mapping is validated. |
| Rates from Mapped TIFF series | Not suitable | Gaps up to 183 s; median interval 167 ms (not 33 ms). |
| Meaning of "BIT", "ICMAD", "F" groups | Unknown | Not documented in loaded sources. |

## Known artefacts that affect pixel metrics
- **Green LED illumination** for 0.4 s every 2 s (urban2019 p.173) lights the whole sample; brightness spikes are
  often illumination, not flame.
- **Burned-in text banner** in TIFF frames (file name, acquisition count, exposure, gain) adds bright pixels.
- **Processing variants** (raw / mapped / ICMAD) have different geometry and contrast; their metrics are not comparable.
- **Fixed threshold (128)** is a heuristic, not tuned per sequence.
- **Sampling** every 5th frame (~6 fps for 30 fps data) can alias the 2 s LED cycle.

## Published reference values
Shown in the *Scientific context* view, labeled *Published reference*, with page numbers. They are **not** computed by
the dashboard and not linked to an image sequence.
