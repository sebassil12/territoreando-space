"""Inventario archivo por archivo de `descompressed/` (solo lectura) → `docs/data-inventory.csv`.

Alcance: SOLO la carpeta de datos crudos `descompressed/`; no recorre nada fuera de ella.
Garantías:
    - Los archivos fuente se abren únicamente en lectura ('rb', zipfile en lectura, Pillow perezoso).
      Nunca se mueven, renombran, tocan ni recomprimen. La única salida es `docs/data-inventory.csv`.
    - El tipo se detecta por firma (bytes mágicos); la extensión solo se compara para avisar discrepancias.
    - Imágenes: solo cabecera (`Image.open` perezoso, `.size`, `.mode`); nunca se decodifican los píxeles.
    - `sample` y `material` solo se rellenan desde un documento local que lo indica explícitamente
      (`SAFFIRE-II DoD.docx`), citado en `source_of_metadata`; nunca desde el nombre del archivo por sí solo.
    - Se calcula sha256 de todos los archivos (lectura en bloques, ~20 s para 2,1 GB) para detectar duplicados.
Los códigos de `source_of_metadata` se explican en `docs/data-audit.md` (leyenda del inventario).
Excepción documentada (AGENTS.md §4): el archivo supera 300 líneas porque reúne una sola responsabilidad
(inventario de solo lectura) y la tarea limita las superficies de edición a este módulo.

Uso: uv run python -m pipeline.build_inventory [--raw descompressed] [--out docs/data-inventory.csv]
"""

import argparse
import csv
import hashlib
import re
import shutil
import subprocess
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

from pipeline import build_catalog as bc

RAW = Path("descompressed")
OUT = Path("docs/data-inventory.csv")
COLUMNS = [
    "relative_path", "filename", "extension", "detected_file_type", "size_bytes", "dimensions", "bit_depth",
    "page_count", "sheet_names", "row_count", "column_names", "experiment", "group", "camera", "sample",
    "material", "data_role", "processing_variant", "sequence_part", "first_raw_id", "last_raw_id",
    "temporal_quality", "calibration_reference", "availability", "source_of_metadata", "confidence", "notes",
]
CHUNK_BYTES = 1 << 20
HEAD_BYTES = 16
XLSX_HEAD_BYTES = 4096
LIST_SEP = ";"
SIGNATURES = [(b"\xff\xd8\xff", "jpeg"), (b"\x89PNG\r\n\x1a\n", "png"), (b"II*\x00", "tiff"),
              (b"MM\x00*", "tiff"), (b"%PDF", "pdf"), (b"PK\x03\x04", "zip")]
EXPECTED_TYPE = {"jpeg": "jpeg", "jpg": "jpeg", "png": "png", "tif": "tiff", "tiff": "tiff", "pdf": "pdf",
                 "docx": "docx", "xlsx": "xlsx", "csv": "text", "txt": "text"}
IMAGE_TYPES = {"jpeg", "png", "tiff"}
MODE_BITS = {"1": "1", "L": "8", "P": "8", "RGB": "8", "RGBA": "8", "CMYK": "8", "YCbCr": "8", "LA": "8",
             "I;16": "16", "I;16B": "16", "I": "32", "F": "32"}
EXPERIMENT = "SAFFIRE-II"  # se asume solo SAFFIRE-II (ver docs/data-audit.md)
# Códigos cortos de procedencia (leyenda completa en docs/data-audit.md) para no repetir citas largas por fila.
SRC_IMAGE = "signature;pillow_header;saffire_inventory.csv"
SRC_SAMPLE = "DoD-T2"  # SAFFIRE-II DoD.docx, Tabla 2 (texto de word/document.xml)
SRC_MATERIAL = "DoD-T1-image"  # SAFFIRE-II DoD.docx, Tabla 1 (imagen word/media/image1.png, transcripción visual)
SRC_DOCUMENT = "signature;content_parsed;role_by_manual_review"
# Columna Material de la Tabla 1 de SAFFIRE-II DoD.docx, transcrita literalmente.
# S5/S6 (SIBAL) y S9 (PMMA plano de 1 cm) se corroboran además en urban2019.pdf pp. 173-174 y 180-181.
SAMPLE_MATERIALS = {"S1": "Silicone", "S2": "Silicone", "S3": "Silicone", "S4": "Silicone",
                    "S5": "SIBAL fabric", "S6": "SIBAL fabric", "S7": "PMMA to Nomex",
                    "S8": "Structured PMMA", "S9": "Flat PMMA"}
FLOW_PHASES = {"F1": "pre-flow", "F2": "post-flow"}  # SAFFIRE-II DoD.docx, párrafo tras la Figura 1
# Rol asignado tras revisar el contenido de cada documento (docs/data-audit.md, «Contenido y rol»).
CONTINUITY = "derived_continuity_analysis"
DOCUMENT_ROLES = {
    "saffire_inventory.csv": "file_inventory", "structure.txt": "directory_listing",
    "continuidad_series.csv": CONTINUITY, "continuidad_saltos.csv": CONTINUITY,
    "continuidad_cortes_entre_series.csv": CONTINUITY, "continuidad_grupos.csv": CONTINUITY,
    "urban2019.pdf": "publication", "SaffireIIStitchedCO2V7.pdf": "sensor_plot",
    "Saffire-II Sample 1 TM Graphs.docx": "sensor_plot", "SAFFIRE-II DoD.docx": "data_overview_document",
    "SAFFIRE-II_Image_Directory_Nomenclature_v3.0.pdf": "nomenclature_document",
    "SAFFIRE-II_MergeResult-jpeg_v5_Final.xlsx": "downlink_manifest",
}


@dataclass(frozen=True)
class Context:
    """Metadatos de apoyo leídos una sola vez: filas de saffire_inventory.csv y secuencias por carpeta."""

    inventory: dict
    sequences: dict


def read_head_and_hash(path: Path) -> tuple[bytes, str]:
    """Lee el archivo en bloques: primeros bytes (firma) y sha256 completo."""
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        head = f.read(CHUNK_BYTES)
        digest.update(head)
        while block := f.read(CHUNK_BYTES):
            digest.update(block)
    return head[:HEAD_BYTES], digest.hexdigest()


def detect_type(head: bytes, path: Path) -> str:
    """Tipo por firma; los zip se distinguen por su contenido (docx/xlsx); sin firma binaria → text o unknown."""
    for magic, kind in SIGNATURES:
        if head.startswith(magic):
            return zip_kind(path) if kind == "zip" else kind
    return "text" if head and b"\x00" not in head else "unknown"


def zip_kind(path: Path) -> str:
    with zipfile.ZipFile(path) as z:
        names = set(z.namelist())
    if "word/document.xml" in names:
        return "docx"
    return "xlsx" if "xl/workbook.xml" in names else "zip"


def image_fields(path: Path) -> dict:
    """Solo cabecera: Pillow abre en modo perezoso y no decodifica píxeles."""
    with Image.open(path) as im:
        width, height = im.size
        mode = im.mode
    return {"dimensions": f"{width}x{height}", "bit_depth": MODE_BITS.get(mode, "unknown"), "notes": f"mode={mode}"}


def pdf_fields(path: Path) -> dict:
    if shutil.which("pdfinfo"):
        info = subprocess.run(["pdfinfo", str(path)], capture_output=True, text=True, check=False).stdout
        match = re.search(r"^Pages:\s+(\d+)", info, re.MULTILINE)
        if match:
            return {"page_count": match.group(1), "notes": "page_count via pdfinfo"}
    pages = len(re.findall(rb"/Type\s*/Page[^s]", path.read_bytes()))
    return {"page_count": str(pages) if pages else "unknown",
            "notes": "page_count via stdlib fallback; text extraction unsupported"}


def docx_fields(path: Path) -> dict:
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        app = z.read("docProps/app.xml").decode("utf-8", "ignore") if "docProps/app.xml" in names else ""
    match = re.search(r"<Pages>(\d+)</Pages>", app)
    n_media = sum(1 for n in names if n.startswith("word/media/"))
    return {"page_count": match.group(1) if match else "unknown",
            "notes": f"page_count from docProps/app.xml (Word estimate); embedded_images={n_media}"}


def xlsx_fields(path: Path) -> dict:
    """Nombres de hoja y filas por hoja según `<dimension ref>` (lee solo el inicio de cada hoja)."""
    with zipfile.ZipFile(path) as z:
        rels = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"',
                               z.read("xl/_rels/workbook.xml.rels").decode("utf-8")))
        sheets = re.findall(r'<sheet name="([^"]+)"[^>]*r:id="(rId\d+)"', z.read("xl/workbook.xml").decode("utf-8"))
        rows = [sheet_row_count(z, "xl/" + rels[rid].lstrip("/").removeprefix("xl/")) for _, rid in sheets]
    return {"sheet_names": LIST_SEP.join(name for name, _ in sheets), "row_count": LIST_SEP.join(rows),
            "notes": "row_count per sheet (same order as sheet_names) from <dimension ref>, header included"}


def sheet_row_count(z: zipfile.ZipFile, member: str) -> str:
    with z.open(member) as f:
        head = f.read(XLSX_HEAD_BYTES).decode("utf-8", "ignore")
    match = re.search(r'<dimension ref="[A-Z]+\d+:[A-Z]+(\d+)"', head)
    return match.group(1) if match else "unknown"


def text_fields(path: Path) -> dict:
    """CSV (por extensión, tras confirmar firma de texto): columnas y filas de datos; otro texto: líneas."""
    with open(path, encoding="utf-8-sig", newline="") as f:
        if path.suffix.lower() != ".csv":
            return {"row_count": str(sum(1 for _ in f)), "notes": "row_count = text lines"}
        reader = csv.reader(f)
        header = next(reader, [])
        n_rows = sum(1 for _ in reader)
    return {"column_names": LIST_SEP.join(header), "row_count": str(n_rows), "notes": "row_count excludes header"}


EXTRACTORS = {"jpeg": image_fields, "png": image_fields, "tiff": image_fields, "pdf": pdf_fields,
              "docx": docx_fields, "xlsx": xlsx_fields, "text": text_fields}


def load_context(raw_root: Path) -> Context:
    path = raw_root / bc.INVENTORY
    if not path.is_file():
        print(f"WARNING: {bc.INVENTORY} not found; image rows will lack sequence metadata")
        return Context({}, {})
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    return Context({f"{r['folder']}/{r['file_name']}": r for r in rows}, index_sequences(rows))


def index_sequences(rows: list[dict]) -> dict:
    """Estadísticas por carpeta con los helpers de build_catalog (sequence_id, interval_stats, assign_roles...)."""
    by_folder, grids = defaultdict(list), {}
    for r in rows:
        if r["file_type"] == "Distortion Grid":
            grids[(r["group"], r["camera"])] = f"{r['folder']}/{r['file_name']}"
        elif r["file_type"] in bc.FILE_TYPES:
            by_folder[r["folder"]].append(r)
    sequences = {}
    for folder, items in by_folder.items():
        first = items[0]
        sid = bc.sequence_id(first["group"], first["camera"], first["file_type"], first["part"], folder)
        sequences[folder] = {"sequence_id": sid, "group": first["group"], "camera": first["camera"],
                             "file_type": first["file_type"], "n_files": len(items),
                             "calibration_file": grids.get((first["group"], first["camera"]), ""),
                             **bc.interval_stats([int(r["raw_id"]) for r in items])}
    bc.assign_roles(list(sequences.values()))
    for seq in sequences.values():
        seq["temporal_quality"] = bc.temporal_quality(seq, seq["n_files"])
    return sequences


def label_fields(entry: dict) -> dict:
    """group/camera del inventario; sample/material solo desde SAFFIRE-II DoD.docx y nunca para BIT."""
    group = entry["group"]
    fields = {"group": group, "camera": entry["camera"]}
    if entry["file_type"] == "BIT" or group not in SAMPLE_MATERIALS:
        return fields
    fields["sample"] = group.removeprefix("S")
    if entry["file_type"] != "Distortion Grid":
        fields["material"] = SAMPLE_MATERIALS[group]
    return fields


def sequence_fields(entry: dict, seq: dict | None) -> dict:
    if entry["file_type"] == "Distortion Grid":
        ref_mm = bc.grid_reference_mm(entry["file_name"])
        return {"data_role": "calibration_grid",
                "calibration_reference": f"reference_length_mm={ref_mm or 'unknown'};status=pending"}
    if not seq:
        return {"data_role": "unknown"}
    variant = "-".join(seq["sequence_id"].split("-")[2:-2])  # sequence_id = group-camera-variant-fmt-part
    return {"data_role": seq["sequence_role"], "processing_variant": variant,
            "sequence_part": entry["part"] if entry["part"].isdigit() else "",
            "first_raw_id": seq["first_raw_id"], "last_raw_id": seq["last_raw_id"],
            "temporal_quality": seq["temporal_quality"],
            # BIT es fotograma completo (1360x1024); las rejillas son de la ROI de la muestra: no se vinculan.
            "calibration_reference": "" if entry["file_type"] == "BIT" else seq["calibration_file"]}


def image_context_fields(rel: str, ctx: Context) -> dict:
    entry = ctx.inventory.get(rel)
    if not entry:
        return {"data_role": "unknown", "source_of_metadata": "signature;pillow_header",
                "notes": "not listed in saffire_inventory.csv"}
    seq = ctx.sequences.get(entry["folder"])
    fields = {**label_fields(entry), **sequence_fields(entry, seq)}
    sources = [SRC_IMAGE] + [SRC_SAMPLE] * bool(fields.get("sample")) + [SRC_MATERIAL] * bool(fields.get("material"))
    return {**fields, "source_of_metadata": LIST_SEP.join(sources), "notes": image_notes(entry, seq)}


def image_notes(entry: dict, seq: dict | None) -> str:
    notes = [f"seq={seq['sequence_id']}" if seq else ""]
    if entry["file_type"] == "BIT":
        notes.append("BIT (DoD-T4): not a sample burn; listed under 'BIT Received' in MergeResult xlsx")
    elif entry["group"] in FLOW_PHASES:
        notes.append(f"{FLOW_PHASES[entry['group']]} (DoD)")
    return join_notes(*notes)


def row_confidence(row: dict) -> str:
    if row["availability"] != "available" or row.get("data_role", "unknown") == "unknown":
        return "low"
    return "medium" if row.get("material") or row.get("sample") else "high"


def describe_file(raw_root: Path, path: Path, ctx: Context) -> tuple[dict, str]:
    """Una fila del inventario y el sha256 del archivo ('' si es ilegible)."""
    rel = path.relative_to(raw_root).as_posix()
    ext = path.suffix.lower().lstrip(".")
    row = {"relative_path": rel, "filename": path.name, "extension": ext, "experiment": EXPERIMENT,
           "size_bytes": path.stat().st_size, "availability": "available"}
    try:
        head, sha = read_head_and_hash(path)
        row["detected_file_type"] = kind = detect_type(head, path)
        row.update(content_fields(kind, path, rel, ctx))
    except (OSError, ValueError, KeyError, zipfile.BadZipFile, UnicodeDecodeError) as exc:
        row.update(availability="unreadable", detected_file_type=row.get("detected_file_type", "unknown"),
                   notes=f"unreadable: {type(exc).__name__}")
        sha = ""
    else:
        expected = EXPECTED_TYPE.get(ext)
        mismatch = f"extension_mismatch: .{ext} but signature={kind}" if expected and expected != kind else ""
        sha_note = "" if kind in IMAGE_TYPES else f"sha256={sha}"
        row["notes"] = join_notes(row.get("notes", ""), mismatch, sha_note)
    row["confidence"] = row_confidence(row)
    return row, sha


def content_fields(kind: str, path: Path, rel: str, ctx: Context) -> dict:
    extracted = EXTRACTORS.get(kind, lambda _p: {})(path)
    if kind not in IMAGE_TYPES:
        return {**extracted, "data_role": DOCUMENT_ROLES.get(path.name, "unknown"), "source_of_metadata": SRC_DOCUMENT}
    context = image_context_fields(rel, ctx)
    return {**extracted, **context, "notes": join_notes(context["notes"], extracted["notes"])}


def join_notes(*parts: str) -> str:
    return "; ".join(p for p in parts if p)


def missing_rows(ctx: Context, seen: set[str]) -> list[dict]:
    """Archivos listados en saffire_inventory.csv que no existen en disco → availability=missing."""
    return [{"relative_path": rel, "filename": entry["file_name"], "extension": entry["extension"],
             "experiment": EXPERIMENT, "availability": "missing", "data_role": "unknown", "confidence": "low",
             "source_of_metadata": bc.INVENTORY, "notes": "listed in inventory but not found on disk"}
            for rel, entry in ctx.inventory.items() if rel not in seen]


def mark_duplicates(rows: list[dict], hashes: list[str]) -> int:
    """Anota en notes los duplicados exactos por sha256; devuelve cuántas filas son duplicadas."""
    first_seen, n_duplicates = {}, 0
    for row, sha in zip(rows, hashes, strict=True):
        if not sha:
            continue
        if sha in first_seen:
            row["notes"] = join_notes(row.get("notes", ""), f"duplicate_sha256_of={first_seen[sha]}")
            n_duplicates += 1
        else:
            first_seen[sha] = row["relative_path"]
    return n_duplicates


def build_inventory(raw_root: Path, out: Path = OUT) -> list[dict]:
    ctx = load_context(raw_root)
    paths = sorted(p for p in raw_root.rglob("*") if p.is_file())
    described = [describe_file(raw_root, p, ctx) for p in paths]
    rows, hashes = [r for r, _ in described], [h for _, h in described]
    n_duplicates = mark_duplicates(rows, hashes)
    rows += missing_rows(ctx, {r["relative_path"] for r in rows})
    write_csv(out, rows)
    print(f"{len(paths)} files on disk, {len(rows)} rows, {n_duplicates} exact duplicates → {out}")
    return rows


def write_csv(out: Path, rows: list[dict]) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS, restval="", extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default=str(RAW), help="folder with the original NASA files (read-only)")
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args()
    build_inventory(Path(args.raw), Path(args.out))
