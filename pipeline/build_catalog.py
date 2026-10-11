"""Construye catálogos normalizados a partir del inventario de SAFFIRE-II.

Entradas (solo lectura, nunca se modifican):
    <raw>/saffire_inventory.csv
    <raw>/continuidad_series.csv   (solo para contraste)
Salidas:
    data/processed/sequence_catalog.csv
    data/processed/frame_catalog.csv
    data/processed/calibration_catalog.csv

Uso: uv run python -m pipeline.build_catalog [--raw descompressed]
"""

import argparse
import csv
import itertools
import re
import statistics
from collections import Counter, defaultdict
from pathlib import Path

INVENTORY = "saffire_inventory.csv"
OUT = Path("data/processed")

# etiqueta file_type del inventario -> (formato contenedor, variante de procesamiento)
FILE_TYPES = {
    "Raw JPEG": ("jpeg", "raw"),
    "Mapped JPEG": ("jpeg", "mapped"),
    "ICMAD PNG": ("png", "icmad"),
    "Mapped TIFF": ("tiff", "mapped"),
    "BIT": ("jpeg", "bit"),
}
# Cuando varias variantes cubren el mismo rango temporal, la primera que aparece aquí es la
# secuencia primaria; las demás se marcan como variantes de procesamiento (no fotogramas extra).
PRIMARY_PREFERENCE = ["Raw JPEG", "Mapped JPEG", "ICMAD PNG", "Mapped TIFF"]

SEQUENCE_COLUMNS = [
    "sequence_id", "group", "camera", "file_type", "processing_variant", "part", "folder",
    "n_files", "first_raw_id", "last_raw_id", "duration_s", "median_diff_ms", "min_diff_ms",
    "max_diff_ms", "duplicates", "n_gaps_gt_2x", "temporal_quality", "sequence_role",
    "calibration_file", "source_file",
]
FRAME_COLUMNS = [
    "frame_id", "sequence_id", "file_name", "relative_path", "raw_id", "frame_index", "time_s",
    "source_file", "availability", "warning",
]
CALIBRATION_COLUMNS = [
    "calibration_id", "sequence_id", "calibration_file", "reference_length_mm",
    "calibration_status", "source_file", "notes",
]


def sequence_id(group: str, camera: str, file_type: str, part: str, folder: str) -> str:  # noqa: PLR0913 — deuda previa a AGENTS.md §4; refactorizar al tocar
    variant = FILE_TYPES[file_type][1]
    if "ICMAD" in folder.upper() and variant != "icmad":
        variant += "-icmad"  # p. ej. Mapped TIFF procesado con ICMAD (S6C1 v2)
    fmt = FILE_TYPES[file_type][0]
    part_slug = f"part{part}" if part.isdigit() else "single"
    return f"{group}-{camera}-{variant}-{fmt}-{part_slug}"


def interval_stats(raw_ids: list[int]) -> dict:
    """Estadísticas temporales de una lista ordenada por raw_id. raw_id se trata como milisegundos."""
    ids = sorted(raw_ids)
    diffs = [b - a for a, b in itertools.pairwise(ids)]
    positive = [d for d in diffs if d > 0]
    median = statistics.median(positive) if positive else 0
    return {
        "first_raw_id": ids[0],
        "last_raw_id": ids[-1],
        "duration_s": round((ids[-1] - ids[0]) / 1000, 3),
        "median_diff_ms": median,
        "min_diff_ms": min(positive) if positive else 0,
        "max_diff_ms": max(positive) if positive else 0,
        "duplicates": sum(c - 1 for c in Counter(ids).values() if c > 1),
        "n_gaps_gt_2x": sum(1 for d in positive if median and d > 2 * median),
    }


def gap_positions(raw_ids: list[int], median_ms: float) -> dict[int, float]:
    """Mapea frame_index -> tamaño del hueco en segundos para los fotogramas que siguen a un hueco > 2x la mediana."""
    return {
        i: (b - a) / 1000
        for i, (a, b) in enumerate(itertools.pairwise(raw_ids), start=1)
        if median_ms and b - a > 2 * median_ms
    }


def assign_roles(sequences: list[dict]) -> None:
    """Fija sequence_role en el lugar: primary / processing_variant / bit_sequence.

    Las secuencias del mismo group+camera cuyos rangos de raw_id se superponen describen la misma
    ventana de adquisición; solo una de ellas es primaria.
    """
    by_key = defaultdict(list)
    for s in sequences:
        if s["file_type"] == "BIT":
            s["sequence_role"] = "bit_sequence"
        else:
            by_key[(s["group"], s["camera"])].append(s)
    for members in by_key.values():
        members.sort(key=lambda s: PRIMARY_PREFERENCE.index(s["file_type"]))
        claimed: list[dict] = []
        for s in members:
            overlaps = any(
                s["first_raw_id"] <= c["last_raw_id"] and c["first_raw_id"] <= s["last_raw_id"]
                for c in claimed
            )
            s["sequence_role"] = "processing_variant" if overlaps else "primary"
            claimed.append(s)


def temporal_quality(seq: dict, n_available: int) -> str:
    if seq["n_files"] == 0:
        return "unknown"
    if seq["n_gaps_gt_2x"] > 0:
        return "gap_detected"
    if seq["sequence_role"] == "processing_variant":
        return "overlapping_variant"
    if n_available < seq["n_files"]:
        return "incomplete"
    return "continuous"


def availability(raw_root: Path, folder: str, file_name: str) -> str:
    if (raw_root / folder / file_name).is_file():
        return "available"
    return "missing" if (raw_root / folder).is_dir() else "path_only"


def grid_reference_mm(file_name: str) -> str:
    m = re.search(r"(\d+)mmBlock", file_name)
    return m.group(1) if m else ""


def build(raw_root: Path, out: Path = OUT) -> dict:  # noqa: C901, PLR0915 — deuda previa a AGENTS.md §4; refactorizar al tocar
    with open(raw_root / INVENTORY, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    by_folder = defaultdict(list)
    grids = []
    for r in rows:
        if r["file_type"] == "Distortion Grid":
            grids.append(r)
        elif r["file_type"] in FILE_TYPES:
            by_folder[r["folder"]].append(r)
        else:
            raise ValueError(f"Unknown file_type {r['file_type']!r} in {r['folder']}")

    grid_by_gc = {(g["group"], g["camera"]): g for g in grids}

    sequences, frames_by_seq = [], {}
    for folder, items in by_folder.items():
        first = items[0]
        items.sort(key=lambda r: int(r["raw_id"]))  # raw_id es el campo de ordenamiento temporal
        ids = [int(r["raw_id"]) for r in items]
        sid = sequence_id(first["group"], first["camera"], first["file_type"], first["part"], folder)
        grid = grid_by_gc.get((first["group"], first["camera"]))
        seq = {
            "sequence_id": sid,
            "group": first["group"],
            "camera": first["camera"],
            "file_type": first["file_type"],
            "processing_variant": FILE_TYPES[first["file_type"]][1],
            "part": first["part"] if first["part"].isdigit() else "",
            "folder": folder,
            "n_files": len(items),
            **interval_stats(ids),
            "calibration_file": f"{grid['folder']}/{grid['file_name']}" if grid else "",
            "source_file": INVENTORY,
        }
        gaps = gap_positions(ids, seq["median_diff_ms"])
        frames = []
        for i, r in enumerate(items):
            warn = []
            if i in gaps:
                warn.append(f"gap_before:{gaps[i]:.3f}s")
            if i and ids[i] == ids[i - 1]:
                warn.append("duplicate_raw_id")
            avail = availability(raw_root, folder, r["file_name"])
            if avail != "available":
                warn.append(f"asset_{avail}")
            frames.append({
                "frame_id": f"{sid}-f{i:05d}",
                "sequence_id": sid,
                "file_name": r["file_name"],
                "relative_path": f"{folder}/{r['file_name']}",
                "raw_id": ids[i],
                "frame_index": i,
                "time_s": round((ids[i] - ids[0]) / 1000, 3),
                "source_file": INVENTORY,
                "availability": avail,
                "warning": ";".join(warn),
            })
        sequences.append(seq)
        frames_by_seq[sid] = frames

    assign_roles(sequences)
    for s in sequences:
        n_avail = sum(f["availability"] == "available" for f in frames_by_seq[s["sequence_id"]])
        s["temporal_quality"] = temporal_quality(s, n_avail)
    sequences.sort(key=lambda s: (s["first_raw_id"], s["camera"], s["sequence_id"]))

    calibrations = []
    for g in grids:
        path = f"{g['folder']}/{g['file_name']}"
        ref = grid_reference_mm(g["file_name"])
        linked = [s["sequence_id"] for s in sequences if (s["group"], s["camera"]) == (g["group"], g["camera"])]
        found = (raw_root / path).is_file()
        notes = "Grid image found; pixel-to-mm mapping not validated." if found else "Grid listed but file not found locally."
        if not ref:
            notes += " Reference block length not stated in file name."
        for sid in linked or [""]:
            calibrations.append({
                "calibration_id": f"CAL-{g['group']}{g['camera']}" + (f"-{sid}" if sid else ""),
                "sequence_id": sid,
                "calibration_file": path,
                "reference_length_mm": ref,
                # ponytail: nunca 'validated' automáticamente; cambiar solo tras un mapeo documentado y comprobado.
                "calibration_status": "pending" if found else "unavailable",
                "source_file": INVENTORY,
                "notes": notes + ("" if sid else " No image sequence for this group/camera in the inventory."),
            })

    out.mkdir(parents=True, exist_ok=True)
    _write(out / "sequence_catalog.csv", SEQUENCE_COLUMNS, sequences)
    _write(out / "frame_catalog.csv", FRAME_COLUMNS, [f for s in sequences for f in frames_by_seq[s["sequence_id"]]])
    _write(out / "calibration_catalog.csv", CALIBRATION_COLUMNS, calibrations)
    return {"sequences": sequences, "frames": frames_by_seq, "calibrations": calibrations}


def cross_check(raw_root: Path, sequences: list[dict]) -> list[str]:
    """Compara nuestras estadísticas con continuidad_series.csv; devuelve las discrepancias en texto legible."""
    path = raw_root / "continuidad_series.csv"
    if not path.is_file():
        return ["continuidad_series.csv not found; cross-check skipped"]
    with open(path, encoding="utf-8-sig", newline="") as f:
        ref = {r["folder"]: r for r in csv.DictReader(f)}
    problems = []
    for s in sequences:
        r = ref.get(s["folder"])
        if not r:
            problems.append(f"{s['folder']}: not in continuidad_series.csv")
            continue
        for ours, theirs in [("n_files", "n_files"), ("first_raw_id", "first_id"), ("last_raw_id", "last_id"),
                             ("n_gaps_gt_2x", "n_gaps_gt_2x"), ("duplicates", "duplicates")]:
            if int(float(r[theirs])) != int(s[ours]):
                problems.append(f"{s['folder']}: {ours}={s[ours]} vs {theirs}={r[theirs]}")
    return problems


def _write(path: Path, columns: list[str], rows: list[dict]) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default="descompressed", help="folder with the original NASA files")
    args = ap.parse_args()
    result = build(Path(args.raw))
    print(f"{len(result['sequences'])} sequences, "
          f"{sum(len(v) for v in result['frames'].values())} frames, "
          f"{len(result['calibrations'])} calibration rows")
    for p in cross_check(Path(args.raw), result["sequences"]):
        print("CROSS-CHECK:", p)
