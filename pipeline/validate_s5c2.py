"""Offline Sample 5/C2 extraction and audit. Inputs stay read-only; no downloads.

Usage: uv run python -m pipeline.validate_s5c2 --root SAFFIRE-local-validation
Only the audit summary belongs in committed data; images and telemetry stay local.
"""

import argparse
import csv
import hashlib
import io
import json
import re
import warnings
from pathlib import Path
from zipfile import BadZipFile, ZipFile

from PIL import Image

from pipeline.s5c2_timing import audit_timing, continuity
from pipeline.sensor_workbook import workbook_rows

BASE = "https://psi.nasa.gov/geode-py/ws/studies/PSI-99/download?file="
SOURCES = {
    "SAFFIRE_II_S5C2_Image_Data_All_JPEGs_part1.zip": ("6840cdd74a0e24d624cebd8d", 15706884),
    "SAFFIRE_II_S5C2_Image_Data_All_JPEGs_part2.zip": ("6840cdd74a0e24d624cebd8e", 28831042),
    "Saffire Sensor Data Sample 5.xlsx": ("6840cdcb4a0e24d624cebd07", 12281904),
    "SAFFIRE-II_S5C2_DistortionGrids_Sample_ROI.zip": ("6840cdcb4a0e24d624cebd03", 145199),
    "SAFFIRE-II_Readme.docx": ("6840cdd84a0e24d624cebd95", 134425),
}
FRAME = re.compile(r"S5C2-(\d+)\.jpeg")
LIMITS = [
    "Archive completeness is not independently checked against the received-image manifest.",
    "Electrical enable is not optical ignition; exposure timing, latency and clock drift remain unverified.",
    "Nearest telemetry timestamp distance is not synchronization uncertainty.",
    "No validated pixel calibration, independently annotated trajectory or quantitative 3D comparison.",
    "Exact Urban 2019 Vf/lp values remain unverified in the original publication.",
]


def write_csv(path, rows, fields):
    with path.open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def inspect_source(path, metadata):
    identifier, size = metadata
    result = {"source_file": path.name, "url": f"{BASE}{identifier}&version=1", "version": 1,
              "expected_bytes": size, "status": "missing"}
    if not path.is_file():
        return result
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    with ZipFile(path) as archive:
        bad_member = archive.testzip()
    result.update(actual_bytes=path.stat().st_size, sha256=digest, crc_ok=bad_member is None,
                  status="available" if bad_member is None and path.stat().st_size == size else "invalid")
    return result


def extract_frame(archive, member, output):
    match = FRAME.fullmatch(member.filename)
    if match is None:
        raise ValueError(f"Unexpected image entry: {member.filename}")
    data = archive.read(member)
    with Image.open(io.BytesIO(data)) as image:
        image.load()
        width, height = image.size
    output.mkdir(parents=True, exist_ok=True)
    (output / member.filename).write_bytes(data)
    return {"raw_id": int(match[1]), "source_file": Path(archive.filename).name,
            "source_member": member.filename, "sha256": hashlib.sha256(data).hexdigest(),
            "width_px": width, "height_px": height, "processing_variant": "onboard_jpeg"}


def extract_images(root, sources):
    frames, parts = [], []
    for name in list(SOURCES)[:2]:
        if sources[name]["status"] != "available":
            continue
        with ZipFile(root / "originals" / name) as archive:
            records = [extract_frame(archive, member, root / "frames" / Path(name).stem)
                       for member in archive.infolist() if not member.is_dir()]
        records.sort(key=lambda item: item["raw_id"])
        parts.append({"source_file": name, **continuity([item["raw_id"] for item in records])})
        frames.extend(records)
    return sorted(frames, key=lambda item: item["raw_id"]), parts


def extract_sensors(root, sources):
    name = "Saffire Sensor Data Sample 5.xlsx"
    if sources[name]["status"] != "available":
        return [], {}, {"status": "unavailable"}
    records = workbook_rows(root / "originals" / name)
    _, headers = next(records)
    _, units = next(records)
    all_rows = list(records)
    rows = [(number, values) for number, values in all_rows if values.get("B")]
    fields = ["source_file", "source_sheet", "source_row", *headers]
    exported = ({"source_file": name, "source_sheet": "Calibrated Data", "source_row": n, **row}
                for n, row in rows)
    write_csv(root / "derived" / "sensors.csv", exported, fields)
    metadata = {"source_file": name, "source_sheet": "Calibrated Data", "header_row": 1, "unit_row": 2,
                "row_count": len(rows), "excluded_rows_without_epoch": len(all_rows) - len(rows),
                "columns": {col: {"label": label, "source_unit": units.get(col, "")}
                                                     for col, label in headers.items()},
                "note": "Cached cells, no formula evaluation; no epoch means no exported observation."}
    (root / "derived" / "sensor_columns.json").write_text(json.dumps(metadata, indent=2) + "\n")
    return rows, headers, {key: value for key, value in metadata.items() if key != "columns"}


def extract_grid(root, sources):
    name = "SAFFIRE-II_S5C2_DistortionGrids_Sample_ROI.zip"
    result = {"source_file": name, "calibration_status": "unavailable", "physical_measurements_enabled": False}
    if sources[name]["status"] != "available":
        return result
    with ZipFile(root / "originals" / name) as archive:
        member = next(item for item in archive.infolist() if item.filename.endswith(".tif"))
        data = archive.read(member)
        with Image.open(io.BytesIO(data)) as image:
            image.load()
            result.update(source_member=member.filename, dimensions_px=list(image.size),
                          calibration_status="pending")
        output = root / "grid"
        output.mkdir(exist_ok=True)
        (output / Path(member.filename).name).write_bytes(data)
    return result


def inspect_sources(root, issues):
    sources = {}
    for name, metadata in SOURCES.items():
        try:
            sources[name] = inspect_source(root / "originals" / name, metadata)
        except (OSError, BadZipFile, ValueError) as error:
            sources[name] = {"source_file": name, "status": "invalid", "error": str(error)}
        if sources[name]["status"] != "available":
            issues.append(f"Source unavailable or invalid: {name}")
    return sources


def build_audit(root):
    (root / "derived").mkdir(parents=True, exist_ok=True)
    issues = list(LIMITS)
    sources = inspect_sources(root, issues)
    frames, parts = extract_images(root, sources)
    rows, headers, sensors = extract_sensors(root, sources)
    timing = audit_timing(frames, rows, headers)
    if frames:
        write_csv(root / "derived" / "frames.csv", frames, list(frames[0]))
    return {"schema_version": 1, "scope": "SAFFIRE-II Sample 5 / C2 onboard JPEG only",
            "mapping_source": {"file": "SAFFIRE-II_Readme.docx", "page": 2, "table": 2},
            "quality": "audit_not_experimental_validation", "sources": list(sources.values()),
            "images": {"parts": parts, "combined": continuity([item["raw_id"] for item in frames]),
                       "decoded_dimensions_px": sorted({(f["width_px"], f["height_px"]) for f in frames})},
            "sensors": sensors, "timing": timing, "calibration": extract_grid(root, sources),
            "comparison": {"status": "blocked", "trajectory": None, "fidelity_error": None},
            "warnings": issues}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("SAFFIRE-local-validation"))
    parser.add_argument("--summary", type=Path, help="Optional new summary destination; never overwrites a file")
    args = parser.parse_args()
    if args.summary and args.summary.exists():
        parser.error("Summary already exists; review it and choose a new output path")
    report = build_audit(args.root)
    destination = args.summary or args.root / "derived" / "audit.json"
    destination.write_text(json.dumps(report, indent=2) + "\n")
    for issue in report["warnings"]:
        warnings.warn(issue, stacklevel=1)
    print(f"Audit saved to {destination}")


if __name__ == "__main__":
    main()
