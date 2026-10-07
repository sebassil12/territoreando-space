"""Compute simple image-derived metrics per frame.

These are pixel statistics, NOT physical flame measurements: no temperature, no length in
mm, no heat-release rate. Units are 8-bit intensity, fractions or pixels.

Usage: uv run python -m pipeline.compute_metrics [--raw descompressed] [--step 5]
"""

import argparse
import csv
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

FRAMES = Path("data/processed/frame_catalog.csv")
OUT = Path("data/processed/frame_metrics.csv")
# ponytail: one fixed global threshold; per-variant/adaptive thresholds if comparisons need it.
THRESHOLD = 128
METHOD = "grayscale(PIL 'L') of the frame; bright = luminance >= threshold"
COLUMNS = ["frame_id", "sequence_id", "metric_name", "value", "unit", "method", "threshold",
           "confidence", "source_file"]

# metric -> (unit, confidence). Mean intensity is a direct statistic; the rest depend on THRESHOLD.
METRICS = {
    "mean_intensity": ("intensity_0_255", "high"),
    "bright_pixel_fraction": ("fraction", "medium"),
    "bright_area_pixels": ("pixels", "medium"),
    "centroid_x": ("px", "low"),
    "centroid_y": ("px", "low"),
    "bbox_width_pixels": ("pixels", "low"),
    "bbox_height_pixels": ("pixels", "low"),
}


def frame_metrics(gray: np.ndarray, threshold: int = THRESHOLD) -> dict[str, float | None]:
    """Metrics for one 2-D uint8 image. Geometry metrics are None when nothing is bright."""
    mask = gray >= threshold
    area = int(mask.sum())
    out: dict[str, float | None] = {
        "mean_intensity": round(float(gray.mean()), 3),
        "bright_pixel_fraction": round(area / gray.size, 6),
        "bright_area_pixels": area,
        "centroid_x": None, "centroid_y": None, "bbox_width_pixels": None, "bbox_height_pixels": None,
    }
    if area:
        ys, xs = np.nonzero(mask)
        out.update(
            centroid_x=round(float(xs.mean()), 2),
            centroid_y=round(float(ys.mean()), 2),
            bbox_width_pixels=int(xs.max() - xs.min() + 1),
            bbox_height_pixels=int(ys.max() - ys.min() + 1),
        )
    return out


def load_gray(path: Path) -> np.ndarray:
    with Image.open(path) as im:
        return np.asarray(im.convert("L"))


def _rows_for(args: tuple[Path, dict]) -> list[dict]:
    raw_root, f = args
    path = raw_root / f["relative_path"]
    if not path.is_file():
        return []  # missing asset: skipped, warning already carried by frame_catalog
    rows = []
    for name, value in frame_metrics(load_gray(path)).items():
        if value is None:
            continue
        unit, confidence = METRICS[name]
        rows.append({
            "frame_id": f["frame_id"], "sequence_id": f["sequence_id"], "metric_name": name,
            "value": value, "unit": unit, "method": METHOD,
            "threshold": "" if name == "mean_intensity" else THRESHOLD,
            "confidence": confidence, "source_file": f["relative_path"],
        })
    return rows


def run(raw_root: Path, step: int) -> int:
    with open(FRAMES, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    last = {}
    for f in rows:
        last[f["sequence_id"]] = f["frame_index"]
    # Keep every Nth frame plus first-after-gap and last frames, so gaps stay visible in charts.
    frames = [f for f in rows if int(f["frame_index"]) % step == 0 or "gap_before" in f["warning"]
              or last[f["sequence_id"]] == f["frame_index"]]
    n = 0
    with open(OUT, "w", encoding="utf-8", newline="") as fh, ProcessPoolExecutor() as pool:
        w = csv.DictWriter(fh, fieldnames=COLUMNS)
        w.writeheader()
        for batch in pool.map(_rows_for, ((raw_root, f) for f in frames), chunksize=256):
            w.writerows(batch)
            n += len(batch)
    return n


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default="descompressed")
    ap.add_argument("--step", type=int, default=5, help="analyze every Nth frame (5 = ~6 fps for 30 fps data)")
    a = ap.parse_args()
    print(f"{run(Path(a.raw), a.step)} metric rows written to {OUT}")
