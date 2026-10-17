"""Audited comparison metadata; no image registration or scientific validation."""

from pathlib import Path

SOURCE = "data/scientific_reference_results.json; data/processed/*_catalog.csv"
WARNINGS = [
    "Qualitative comparison only. Scientific fidelity and numerical error cannot be assessed.",
    "Filename-relative image time has no verified correspondence to the virtual steady-window clock.",
    "No validated camera calibration or measured front/base time series is available for this comparison.",
    "Exact Urban Vf/lp pairs remain unverified; NASA Evidence Replay does not use them to animate the 3D.",
]


def citation(refs: dict, item: dict) -> dict:
    source = refs.get("sources", {}).get(item.get("source"), {})
    return {**item, "file": source.get("file"), "url": source.get("url")}


def reviewed_item(refs: dict, item: dict | None) -> dict | None:
    if not item:
        return None
    cited = citation(refs, item)
    if not cited["file"] or not cited["url"] or type(cited.get("page")) is not int or cited["page"] <= 0:
        return None
    return cited


def sequence_audit(sequence: dict, frames: list[dict], raw: Path) -> dict:
    available = sum((raw / frame["relative_path"]).is_file() for frame in frames) if raw.is_dir() else 0
    return {**sequence, "catalog_frame_count": len(frames), "local_frame_count": available,
            "asset_status": "available" if frames and available == len(frames) else
                            "partial" if available else "unavailable",
            "availability_basis": "filesystem_at_application_startup",
            "timestamp_basis": "(raw_id - sequence.first_raw_id) / 1000; filename-relative seconds"}


def mapped_sequences(audit: dict, inventory: dict) -> list[dict]:
    mapping = audit.get("image_mapping")
    if not mapping:
        return []
    return [seq for seq in inventory.values()
            if seq["group"] == mapping.get("group") and seq["camera"] in mapping.get("cameras", [])
            and seq["sequence_role"] != "bit_sequence"]


def replay_case(refs: dict, case: dict, inventory: dict) -> dict:
    specs = [spec for spec in refs.get("playback_cases", []) if spec["case_id"] == case["case_id"]]
    audit = specs[0].get("replay_audit", {}) if len(specs) == 1 else {}
    mapping = reviewed_item(refs, audit.get("image_mapping"))
    sequences = mapped_sequences({"image_mapping": mapping}, inventory)
    return {
        "case_id": case["case_id"], "label": case["label"], "quality": "qualitative_only",
        "reference_evidence": case["evidence"], "reference_audit": citation(refs, {
            "status": audit.get("reference_status", "unreviewed"), "notes": audit.get("reference_note"),
            "source": audit.get("comparison_source"), "page": audit.get("comparison_page"),
        }),
        "geometry": reviewed_item(refs, audit.get("geometry")),
        "image_mapping": mapping,
        "sequences": sequences,
        "synchronization": {"status": "unavailable", "enabled": False, "time_transform": None},
        # Deliberate fail-closed contract. Adding reviewed pairs alone cannot supply temporal registration.
        "reconstruction": {"status": "schematic_only", "trajectory": None, "fidelity_error": None},
        "warnings": [*WARNINGS, *case["missing_requirements"],
                     *([] if sequences else ["No documented image sequences for this case in the loaded catalog."])],
    }


def compile_replay(refs: dict, playback: dict, inventory: dict) -> dict:
    return {"schema_version": "1", "cases": [replay_case(refs, case, inventory) for case in playback["cases"]]}


def mapped_groups(refs: dict) -> set[str]:
    mappings = [case.get("replay_audit", {}).get("image_mapping") for case in refs.get("playback_cases", [])]
    return {item["group"] for item in mappings if item and item.get("group")}
