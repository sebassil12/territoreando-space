import csv
from pathlib import Path

import numpy as np
import pytest

from pipeline import build_catalog as bc
from pipeline.compute_metrics import frame_metrics

HEADER = ["folder", "file_name", "file_type", "group", "camera", "mapped", "part", "raw_id", "extension"]


def make_raw(tmp_path: Path, rows: list[tuple], create_files: bool = True) -> Path:
    raw = tmp_path / "raw"
    raw.mkdir()
    with open(raw / bc.INVENTORY, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(HEADER)
        w.writerows(rows)
    if create_files:
        for r in rows:
            (raw / r[0]).mkdir(exist_ok=True)
            (raw / r[0] / r[1]).write_bytes(b"x")
    return raw


def row(folder, ftype, raw_id, group="S1", camera="C2", part="1", ext="jpeg"):
    return (folder, f"{group}{camera}-{raw_id}.{ext}", ftype, group, camera, "No", part, raw_id, ext)


def test_frames_sorted_by_raw_id_and_time_derived(tmp_path):
    ids = [1000, 1066, 1033, 1099]  # desordenados a propósito en el inventario
    raw = make_raw(tmp_path, [row("A", "Raw JPEG", i) for i in ids])
    out = bc.build(raw, tmp_path / "out")
    frames = next(iter(out["frames"].values()))
    assert [f["raw_id"] for f in frames] == sorted(ids)
    assert [f["frame_index"] for f in frames] == [0, 1, 2, 3]
    assert [f["time_s"] for f in frames] == [0.0, 0.033, 0.066, 0.099]


def test_interval_stats_detect_duplicates_and_gaps():
    s = bc.interval_stats([0, 33, 66, 66, 99, 500])
    assert s["duplicates"] == 1
    assert s["median_diff_ms"] == 33
    assert s["n_gaps_gt_2x"] == 1
    assert s["max_diff_ms"] == 401


def test_gap_sequence_flagged_and_frame_warned(tmp_path):
    ids = [0, 167, 334, 501, 5000, 5167]
    raw = make_raw(tmp_path, [row("T", "Mapped TIFF", i, part="—", ext="tif") for i in ids])
    out = bc.build(raw, tmp_path / "out")
    seq = out["sequences"][0]
    assert seq["temporal_quality"] == "gap_detected"
    frames = out["frames"][seq["sequence_id"]]
    assert frames[4]["warning"].startswith("gap_before:4.499s")


def test_raw_and_mapped_same_range_are_variants_not_extra_frames(tmp_path):
    ids = [0, 33, 66]
    rows = [row("RAW", "Raw JPEG", i, part="2") for i in ids] + [row("MAP", "Mapped JPEG", i, part="2") for i in ids]
    raw = make_raw(tmp_path, rows)
    out = bc.build(raw, tmp_path / "out")
    by_type = {s["file_type"]: s for s in out["sequences"]}
    assert by_type["Raw JPEG"]["sequence_role"] == "primary"
    assert by_type["Mapped JPEG"]["sequence_role"] == "processing_variant"
    assert by_type["Mapped JPEG"]["temporal_quality"] == "overlapping_variant"
    assert by_type["Raw JPEG"]["sequence_id"] != by_type["Mapped JPEG"]["sequence_id"]
    assert all(len(v) == 3 for v in out["frames"].values())  # nunca se combinan en 6 fotogramas


def test_consecutive_parts_of_different_variants_are_both_primary(tmp_path):
    rows = [row("P1", "Raw JPEG", i, part="1") for i in (0, 33)] + [row("P2", "Mapped JPEG", i, part="2") for i in (66, 99)]
    out = bc.build(make_raw(tmp_path, rows), tmp_path / "out")
    assert {s["sequence_role"] for s in out["sequences"]} == {"primary"}


def test_missing_assets_marked_not_crash(tmp_path):
    raw = make_raw(tmp_path, [row("GONE", "Raw JPEG", i) for i in (0, 33)], create_files=False)
    out = bc.build(raw, tmp_path / "out")
    seq = out["sequences"][0]
    frames = out["frames"][seq["sequence_id"]]
    assert {f["availability"] for f in frames} == {"path_only"}
    assert seq["temporal_quality"] == "incomplete"
    assert "asset_path_only" in frames[0]["warning"]


def test_source_file_on_every_record(tmp_path):
    raw = make_raw(tmp_path, [row("A", "Raw JPEG", i) for i in (0, 33)])
    out = bc.build(raw, tmp_path / "out")
    assert all(s["source_file"] for s in out["sequences"])
    assert all(f["source_file"] for fs in out["frames"].values() for f in fs)


def test_calibration_never_validated_automatically(tmp_path):
    rows = [row("A", "Raw JPEG", i) for i in (0, 33)]
    rows.append(("G", "SAFFIRE-II_S1C2_DistortionGrid-30mmBlock_640X140_color.tif", "Distortion Grid", "S1", "C2", "Calibration", "—", "", "tif"))
    out = bc.build(make_raw(tmp_path, rows), tmp_path / "out")
    cal = out["calibrations"][0]
    assert cal["calibration_status"] == "pending"
    assert cal["reference_length_mm"] == "30"
    assert cal["sequence_id"] == out["sequences"][0]["sequence_id"]


def test_unknown_file_type_rejected(tmp_path):
    raw = make_raw(tmp_path, [row("A", "Mystery", 0)])
    with pytest.raises(ValueError):
        bc.build(raw, tmp_path / "out")


def test_frame_metrics_pixels_only():
    img = np.zeros((10, 20), dtype=np.uint8)
    img[2:4, 5:9] = 255
    m = frame_metrics(img, threshold=128)
    assert m["bright_area_pixels"] == 8
    assert m["bbox_width_pixels"] == 4 and m["bbox_height_pixels"] == 2
    assert m["centroid_x"] == 6.5 and m["centroid_y"] == 2.5
    assert m["bright_pixel_fraction"] == 8 / 200


def test_frame_metrics_dark_frame_has_no_geometry():
    m = frame_metrics(np.zeros((5, 5), dtype=np.uint8))
    assert m["bright_area_pixels"] == 0 and m["centroid_x"] is None
