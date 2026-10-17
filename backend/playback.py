"""Local steady-state kinematics from published references, never measured time series."""

import math

QUALITY = "derived_from_published_reference"
SOURCE = "data/scientific_reference_results.json; Urban et al. (2019), cited pages per input"
WARNINGS = [
    "Data-driven reconstruction from published steady references, not measured continuous motion or CFD.",
    "Source values/pages are inherited repository transcriptions; original article PDF not independently reverified.",
    "Time zero and position zero are local display conventions, not ignition time or absolute sample coordinates.",
    "One pyrolysis-length transit is an illustrative window, not an observed steady interval or burn duration.",
    "Pyrolysis front/base are not measured luminous-flame boundaries; flame envelope and char mask are schematic.",
    "No temperature, heat release, mass consumption or extinction is calculated. No image calibration is implied.",
]


def reference_quantity(refs: dict, reference_id: str, units: tuple) -> dict:
    rows = [r for r in refs.get("results", []) if r.get("id") == reference_id]
    if len(rows) != 1:
        raise ValueError(f"Missing or ambiguous published reference: {reference_id}")
    row = rows[0]
    value, page = row.get("value"), row.get("page")
    source = refs.get("sources", {}).get(row.get("source"), {})
    if type(value) not in (float, int) or not math.isfinite(value) or value <= 0:
        raise ValueError(f"Invalid positive finite value: {reference_id}")
    if row.get("unit") not in units or type(page) is not int or page <= 0 or not source.get("file"):
        raise ValueError(f"Missing units or source file/page: {reference_id}")
    return {"reference_id": reference_id, "label": "Published reference", "classification": "experimental_published",
            "value": value, "unit": row["unit"], "file": source["file"], "page": page,
            "url": f"https://doi.org/{source['doi']}" if source.get("doi") else None,
            "notes": row.get("notes", ""), "flow": row.get("flow"), "experiment": row.get("experiment"),
            "transcribed_from": row.get("transcribed_from")}


def steady_trajectory(vf: dict, lp: dict) -> dict:
    speed = vf["value"]  # Explicit mm/s contract; no implicit speed conversion.
    length = lp["value"] * (10 if lp["unit"] == "cm" else 1)
    duration = length / speed
    if not all(math.isfinite(v) and v > 0 for v in (length, duration, 2 * length)):
        raise ValueError("Derived playback bounds are not finite and positive.")
    return {
        "kind": "steady_reference_kinematics", "classification": "derived",
        "units": {"time": "s", "position": "mm"}, "interpolation": "linear_derived_not_measured",
        "duration_s": duration, "display_extent_mm": 2 * length,
        "coordinate_origin": "trailing_pyrolysis_boundary_at_virtual_time_zero",
        "time_origin": "virtual_steady_window_not_ignition", "vf_mm_s": speed, "lp_mm": length,
        "formulas": {"x_front": "lp + Vf * t", "l_p": "lp", "x_base": "x_front - l_p"},
        "anchors": [{"time_s": 0, "x_front_mm": length, "l_p_mm": length, "x_base_mm": 0},
                    {"time_s": duration, "x_front_mm": 2 * length, "l_p_mm": length, "x_base_mm": length}],
    }


def compile_case(refs: dict, spec: dict) -> dict:
    result = {"case_id": spec["case_id"], "label": spec["label"], "status": "unavailable",
              "quality": "unavailable", "source_review": spec.get("source_review"),
              "time_series_status": spec.get("time_series_status"), "warnings": list(WARNINGS),
              "airflow": None, "evidence": {}, "trajectory": None, "missing_requirements": []}
    try:
        vf = reference_quantity(refs, spec["vf_reference_id"], ("mm/s",))
        lp = reference_quantity(refs, spec["lp_reference_id"], ("cm", "mm"))
        if not vf["experiment"] or vf["experiment"] != lp["experiment"]:
            raise ValueError("Speed and pyrolysis length must belong to the same experimental case.")
        if spec.get("airflow_direction") != "concurrent" or not vf["flow"]:
            raise ValueError("This playback requires documented concurrent airflow context.")
        result.update(status="available", quality=QUALITY, evidence={"vf": vf, "lp": lp},
                      airflow={"direction": spec["airflow_direction"], "condition": vf["flow"],
                               "reference_id": vf["reference_id"], "file": vf["file"], "page": vf["page"]},
                      trajectory=steady_trajectory(vf, lp))
    except (ValueError, KeyError, TypeError) as exc:
        result["missing_requirements"].append(str(exc))
    return result


def compile_playback(refs: dict) -> dict:
    """Normalize reference inputs once at startup; no raw-data derivation during requests."""
    cases = [compile_case(refs, spec) for spec in refs.get("playback_cases", [])]
    return {"schema_version": "1", "cases": cases}
