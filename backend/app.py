"""Backend FastAPI que sirve los catálogos de evidencia de SAFFIRE-II.

Toda respuesta JSON usa el mismo envoltorio: {data, source, warnings, quality}.

Ejecutar: uv run uvicorn backend.app:app --reload
"""

import csv
import io
import json
import os
from collections import defaultdict
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, Response
from PIL import Image
from pydantic import BaseModel

from backend import assistant

ROOT = Path(__file__).resolve().parent.parent
PROCESSED = ROOT / "data" / "processed"
REFERENCES = ROOT / "data" / "scientific_reference_results.json"
RAW = Path(os.environ.get("SAFFIRE_RAW_DIR", ROOT / "descompressed"))

INT_FIELDS = {"n_files", "first_raw_id", "last_raw_id", "duplicates", "n_gaps_gt_2x", "raw_id", "frame_index"}
FLOAT_FIELDS = {"duration_s", "median_diff_ms", "min_diff_ms", "max_diff_ms", "time_s", "value"}

INVESTIGATION = {
    "investigation_id": "SAFFIRE-II",
    "title": "Spacecraft Fire Safety Experiment II (Saffire-II)",
    "platform": "Cygnus resupply vehicle, mission CRS OA-5 (after departing the ISS)",
    "summary": "Nine small samples (29 cm x 5 cm), including SIBAL cotton-fiberglass fabric (Samples 5 and 6) "
               "and a 1-cm-thick PMMA slab (Sample 9), burned in a flow tunnel in microgravity.",
    "dataset_label": "PSI-99 (as named in the challenge brief)",
    "source": "urban2019.pdf (Combustion and Flame 199, 2019), Section 2.2",
}


def envelope(data, source, warnings=None, quality="ok"):
    return {"data": data, "source": source, "warnings": warnings or [], "quality": quality}


def _typed(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if v == "":
            out[k] = None
        elif k in INT_FIELDS:
            out[k] = int(float(v))
        elif k in FLOAT_FIELDS:
            out[k] = float(v)
        else:
            out[k] = v
    return out


def _read_csv(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    with open(path, encoding="utf-8", newline="") as f:
        return [_typed(r) for r in csv.DictReader(f)]


def sequence_warnings(seq: dict, primary_of: dict, calibration_status: str) -> list[str]:
    w = []
    if seq["n_gaps_gt_2x"]:
        w.append(f"{seq['n_gaps_gt_2x']} temporal gap(s) larger than 2x the median interval "
                 f"(max {seq['max_diff_ms'] / 1000:.1f} s). Not suitable for temporal-rate analysis.")
    if seq["sequence_role"] == "processing_variant":
        w.append(f"Processing variant of the same acquisition window as {primary_of.get(seq['sequence_id'], 'another sequence')}. "
                 "Do not concatenate with it as extra frames.")
    if seq["sequence_role"] == "bit_sequence":
        w.append("The meaning of 'BIT' is not documented in the loaded sources.")
    if seq["group"].startswith("F"):
        w.append("The meaning of group prefix 'F' is not documented in the loaded sources.")
    if calibration_status != "validated":
        w.append(f"Spatial calibration {calibration_status}: measurements shown in pixels only.")
    w.append(f"'{seq['group']}' is a folder label; it is not proven to be a Saffire-2 sample number. "
             f"'{seq['camera']}' as camera channel is a candidate interpretation.")
    return w


def create_app(processed: Path = PROCESSED, raw: Path = RAW, references: Path = REFERENCES) -> FastAPI:
    sequences = {s["sequence_id"]: s for s in _read_csv(processed / "sequence_catalog.csv")}
    frames = _read_csv(processed / "frame_catalog.csv")
    frames_by_id = {f["frame_id"]: f for f in frames}
    frames_by_seq = defaultdict(list)
    for f in frames:
        frames_by_seq[f["sequence_id"]].append(f)
    calibrations = _read_csv(processed / "calibration_catalog.csv")
    cal_by_seq = {c["sequence_id"]: c for c in calibrations if c["sequence_id"]}
    metrics_by_seq = defaultdict(list)
    for m in _read_csv(processed / "frame_metrics.csv"):
        metrics_by_seq[m["sequence_id"]].append(m)
    refs = json.loads(references.read_text(encoding="utf-8")) if references.is_file() else {"results": [], "facts": [], "sources": {}}

    # secuencia primaria de cada variante de procesamiento (mismo group/camera, rango superpuesto)
    primary_of = {}
    for s in sequences.values():
        if s["sequence_role"] == "processing_variant":
            for p in sequences.values():
                if (p["sequence_role"] == "primary" and (p["group"], p["camera"]) == (s["group"], s["camera"])
                        and p["first_raw_id"] <= s["last_raw_id"] and s["first_raw_id"] <= p["last_raw_id"]):
                    primary_of[s["sequence_id"]] = p["sequence_id"]

    def cal_status(sid: str) -> str:
        return cal_by_seq[sid]["calibration_status"] if sid in cal_by_seq else "unavailable"

    def get_seq(sid: str) -> dict:
        if sid not in sequences:
            raise HTTPException(404, f"Unknown sequence_id: {sid}")
        return sequences[sid]

    def seq_view(s: dict) -> dict:
        return {**s, "calibration_status": cal_status(s["sequence_id"]), "primary_sequence_id": primary_of.get(s["sequence_id"])}

    ctx = assistant.Context(sequences, frames_by_seq, metrics_by_seq, refs, cal_status, primary_of)

    app = FastAPI(title="Flame in Freefall API")

    @app.get("/api/health")
    def health():
        missing = [p.name for p in [processed / "sequence_catalog.csv", processed / "frame_catalog.csv"] if not p.is_file()]
        return envelope({"status": "ok" if not missing else "degraded", "sequences": len(sequences),
                         "frames": len(frames), "raw_dir_found": raw.is_dir()},
                        "data/processed", [f"Missing catalog: {m}" for m in missing],
                        "ok" if not missing else "degraded")

    @app.get("/api/investigations")
    def investigations():
        return envelope([INVESTIGATION], INVESTIGATION["source"],
                        [("i_Investigation.txt and s_PSI-99-2.txt are not in the loaded sources; "
                         "investigation metadata comes from urban2019.pdf only.")])

    @app.get("/api/sequences")
    def list_sequences(group: str | None = None, camera: str | None = None, file_type: str | None = None,
                       processing_variant: str | None = None, temporal_quality: str | None = None):
        filters = {"group": group, "camera": camera, "file_type": file_type,
                   "processing_variant": processing_variant, "temporal_quality": temporal_quality}
        rows = [seq_view(s) for s in sequences.values()
                if all(v is None or s[k] == v for k, v in filters.items())]
        warns = [] if sequences else ["sequence_catalog.csv not found; run pipeline.build_catalog"]
        return envelope(rows, "data/processed/sequence_catalog.csv (from saffire_inventory.csv)", warns,
                        "ok" if sequences else "unavailable")

    @app.get("/api/sequences/{sequence_id}")
    def sequence(sequence_id: str):
        s = get_seq(sequence_id)
        return envelope(seq_view(s), s["source_file"],
                        sequence_warnings(s, primary_of, cal_status(sequence_id)), s["temporal_quality"])

    @app.get("/api/sequences/{sequence_id}/frames")
    def sequence_frames(sequence_id: str, offset: int = Query(0, ge=0), limit: int = Query(500, ge=1, le=10000),
                        step: int = Query(1, ge=1)):
        s = get_seq(sequence_id)
        rows = frames_by_seq[sequence_id][offset::step][:limit]
        warns = sorted({w for f in rows for w in (f["warning"] or "").split(";") if w})
        return envelope({"total": len(frames_by_seq[sequence_id]), "offset": offset, "step": step, "frames": rows},
                        s["source_file"], warns, s["temporal_quality"])

    @app.get("/api/frames/{frame_id}")
    def frame(frame_id: str):
        f = frames_by_id.get(frame_id)
        if not f:
            raise HTTPException(404, f"Unknown frame_id: {frame_id}")
        warns = [w for w in (f["warning"] or "").split(";") if w]
        on_disk = (raw / f["relative_path"]).is_file()
        if not on_disk:
            warns.append("Image file not found on this machine.")
        metrics = {m["metric_name"]: {"value": m["value"], "unit": m["unit"], "confidence": m["confidence"]}
                   for m in metrics_by_seq.get(f["sequence_id"], []) if m["frame_id"] == frame_id}
        return envelope({**f, "image_available": on_disk, "image_url": f"/api/frames/{frame_id}/image" if on_disk else None,
                         "metrics": metrics}, f["source_file"], warns,
                        sequences[f["sequence_id"]]["temporal_quality"])

    @app.get("/api/frames/{frame_id}/image")
    def frame_image(frame_id: str):
        f = frames_by_id.get(frame_id)
        if not f:
            raise HTTPException(404, f"Unknown frame_id: {frame_id}")
        path = raw / f["relative_path"]
        if not path.is_file():
            raise HTTPException(404, f"Image not available locally: {f['relative_path']}")
        if path.suffix.lower() in {".tif", ".tiff"}:  # los navegadores no pueden mostrar TIFF
            buf = io.BytesIO()
            with Image.open(path) as im:
                im.convert("RGB").save(buf, "PNG")
            return Response(buf.getvalue(), media_type="image/png")
        return FileResponse(path)

    @app.get("/api/calibrations")
    def list_calibrations():
        return envelope(calibrations, "data/processed/calibration_catalog.csv",
                        ["No calibration is validated. Pixel-to-mm conversion is disabled."], "pending")

    @app.get("/api/sources")
    def sources():
        listed = [
            {"id": "saffire_inventory", "file": "descompressed/saffire_inventory.csv", "kind": "file inventory", "available": (raw / "saffire_inventory.csv").is_file()},
            {"id": "continuidad_series", "file": "descompressed/continuidad_series.csv", "kind": "continuity analysis (cross-check)", "available": (raw / "continuidad_series.csv").is_file()},
            {"id": "continuidad_saltos", "file": "descompressed/continuidad_saltos.csv", "kind": "gap list", "available": (raw / "continuidad_saltos.csv").is_file()},
            {"id": "continuidad_cortes", "file": "descompressed/continuidad_cortes_entre_series.csv", "kind": "between-series relations", "available": (raw / "continuidad_cortes_entre_series.csv").is_file()},
            {"id": "urban2019", "file": "descompressed/urban2019.pdf", "kind": "peer-reviewed paper",
             "citation": refs.get("sources", {}).get("urban2019", {}).get("citation"), "available": (raw / "urban2019.pdf").is_file()},
            {"id": "scientific_reference_results", "file": "data/scientific_reference_results.json", "kind": "values transcribed from urban2019", "available": references.is_file()},
        ]
        missing = ["i_Investigation.txt", "s_PSI-99-2.txt"]
        return envelope(listed, "project", [f"Not in loaded sources: {m}" for m in missing])

    @app.get("/api/metrics/{sequence_id}")
    def metrics(sequence_id: str):
        s = get_seq(sequence_id)
        time_by_frame = {f["frame_id"]: f["time_s"] for f in frames_by_seq[sequence_id]}
        series: dict[str, dict] = {}
        for m in metrics_by_seq.get(sequence_id, []):
            point = series.setdefault(m["frame_id"], {"frame_id": m["frame_id"], "time_s": time_by_frame.get(m["frame_id"])})
            point[m["metric_name"]] = m["value"]
        points = sorted(series.values(), key=lambda p: p["time_s"] or 0)
        units = {m["metric_name"]: m["unit"] for m in metrics_by_seq.get(sequence_id, [])}
        warns = ["Image-derived pixel statistics only. Not temperature, physical length, heat-release rate or risk.",
                 "Green LED illumination (0.4 s every 2 s, urban2019 p.173) can raise brightness periodically.",
                 "Metrics are not comparable across processing variants (raw / mapped / ICMAD)."]
        if s["n_gaps_gt_2x"]:
            warns.append("Sequence has temporal gaps: do not derive rates from this series.")
        if not points:
            warns.append("No metrics computed for this sequence; run pipeline.compute_metrics.")
        method = metrics_by_seq[sequence_id][0]["method"] if metrics_by_seq.get(sequence_id) else None
        return envelope({"sequence_id": sequence_id, "units": units, "method": method, "points": points},
                        "data/processed/frame_metrics.csv", warns, s["temporal_quality"])

    @app.get("/api/references")
    def references_view():
        return envelope(refs, "urban2019.pdf", [("Published reference values; not computed by this dashboard "
                                                "and not linked to a specific image sequence.")], "published_reference")

    class Question(BaseModel):
        question: str
        sequence_id: str | None = None

    @app.post("/api/assistant")
    def ask(q: Question):
        answer = assistant.answer(ctx, q.question, q.sequence_id)
        return envelope(answer, ", ".join(answer["evidence_sources"]) or "none",
                        [] if answer["grounded"] else ["Not available in the loaded sources."],
                        "grounded" if answer["grounded"] else "not_available")

    return app


app = create_app()
