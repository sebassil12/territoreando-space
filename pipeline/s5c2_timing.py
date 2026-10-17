"""Audit timestamp compatibility; never identify optical ignition or validate clocks."""

from bisect import bisect_left
from itertools import pairwise
from statistics import median

CHANNELS = {"AR": "Igniter Power Enable", "AW": "Igniter Select 5", "BE": "Camera 2 Trigger"}


def continuity(epochs):
    differences = [right - left for left, right in pairwise(epochs)]
    positive = [value for value in differences if value > 0]
    typical = median(positive) if positive else None
    return {
        "count": len(epochs), "first_id": epochs[0] if epochs else None,
        "last_id": epochs[-1] if epochs else None,
        "span_s": (epochs[-1] - epochs[0]) / 1000 if epochs else None,
        "median_interval_ms": typical, "max_interval_ms": max(differences, default=None),
        "duplicate_ids": len(epochs) - len(set(epochs)),
        "nonpositive_intervals": sum(value <= 0 for value in differences),
        "gaps_over_twice_median": sum(value > 2 * typical for value in positive) if typical else 0,
    }


def transitions(rows, column):
    events = []
    for previous, current in pairwise(rows):
        before, after = previous[1].get(column), current[1].get(column)
        if before != after:
            events.append({"row": current[0], "previous_row": previous[0], "from": before, "to": after,
                           "previous_epoch_ms": int(previous[1]["B"]), "epoch_ms": int(current[1]["B"]),
                           "elapsed_s": float(current[1]["A"])})
    return events


def nearest_row(epoch, rows, epochs):
    index = bisect_left(epochs, epoch)
    candidates = range(max(0, index - 1), min(len(rows), index + 1))
    return min(candidates, key=lambda item: abs(epochs[item] - epoch))


def frame_registration(frames, rows, origin):
    """Candidate numerical alignment only; nearest-neighbor residual is not clock accuracy."""
    epochs = [int(row["B"]) for _, row in rows]
    for frame in frames:
        epoch = frame["raw_id"]
        index = nearest_row(epoch, rows, epochs)
        frame.update({"workbook_elapsed_s_candidate": (epoch - origin) / 1000,
                      "nearest_sensor_row": rows[index][0],
                      "image_minus_sensor_ms": epoch - epochs[index],
                      "within_sensor_coverage": epochs[0] <= epoch <= epochs[-1]})


def audit_timing(frames, rows, headers):
    if not rows or any(headers.get(col) != name for col, name in CHANNELS.items()):
        return {"status": "unavailable", "warning": "Missing telemetry or unexpected channel headers"}
    if headers.get("A") != "Elapsed Time (s)" or headers.get("B") != "Epoch Time":
        return {"status": "unavailable", "warning": "Unexpected time headers"}
    epochs = [int(row["B"]) for _, row in rows]
    summary = continuity(epochs)
    if summary["nonpositive_intervals"]:
        return {"status": "unavailable", "warning": "Telemetry epochs are not strictly increasing"}
    origin = epochs[0]
    frame_registration(frames, rows, origin)
    return {
        "status": "candidate_epoch_alignment_only", "sensor_time": summary,
        "elapsed_zero_epoch_ms": origin,
        "max_elapsed_formula_residual_s": max(abs(float(r["A"]) - (int(r["B"]) - origin) / 1000)
                                              for _, r in rows),
        "events": {name: transitions(rows, col) for col, name in CHANNELS.items()},
        "frames_outside_sensor_coverage": sum(not f["within_sensor_coverage"] for f in frames),
        "max_nearest_sensor_distance_ms": max((abs(f["image_minus_sensor_ms"]) for f in frames), default=None),
        "optical_ignition_epoch_ms": None, "clock_drift_verified": False,
        "utc_verified": False, "reconstruction_time_transform": None,
    }
