import csv
import hashlib
import zipfile
from pathlib import Path

from PIL import Image

from pipeline import build_catalog as bc
from pipeline import build_inventory as bi

INVENTORY_HEADER = ["folder", "file_name", "file_type", "group", "camera", "mapped", "part", "raw_id", "extension"]
XLSX_WORKBOOK = '<workbook><sheets><sheet name="Sample1 - jpeg" sheetId="4" r:id="rId1"/></sheets></workbook>'
XLSX_RELS = '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'


def make_raw(tmp_path: Path) -> Path:
    """Árbol sintético: secuencia S5 (2 PNG), BIT S1 (1 JPEG), documentos y archivos problemáticos."""
    raw = tmp_path / "raw"
    (raw / "SEQ").mkdir(parents=True)
    (raw / "BIT").mkdir()
    Image.new("RGB", (7, 3)).save(raw / "SEQ" / "S5C2-1000.jpeg.png")
    Image.new("RGB", (7, 3), "white").save(raw / "SEQ" / "S5C2-1033.jpeg.png")
    Image.new("L", (4, 2)).save(raw / "BIT" / "S1C1-500.jpeg", format="JPEG")
    Image.new("I;16", (5, 5)).save(raw / "deep.tif")
    Image.new("RGB", (2, 2), "red").save(raw / "renamed.jpeg", format="PNG")  # PNG con extensión .jpeg
    (raw / "notes.txt").write_text("a\nb\n", encoding="utf-8")
    (raw / "fake.jpeg").write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 20)  # firma PNG truncada
    (raw / "blob.bin").write_bytes(b"\x00\x01\x02binary")
    with zipfile.ZipFile(raw / "book.xlsx", "w") as z:
        z.writestr("xl/workbook.xml", XLSX_WORKBOOK)
        z.writestr("xl/_rels/workbook.xml.rels", XLSX_RELS)
        z.writestr("xl/worksheets/sheet1.xml", '<worksheet><dimension ref="A1:K42"/></worksheet>')
    rows = [("SEQ", "S5C2-1000.jpeg.png", "ICMAD PNG", "S5", "C2", "No", "1", "1000", "png"),
            ("SEQ", "S5C2-1033.jpeg.png", "ICMAD PNG", "S5", "C2", "No", "1", "1033", "png"),
            ("BIT", "S1C1-500.jpeg", "BIT", "S1", "C1", "No", "—", "500", "jpeg")]
    with open(raw / bc.INVENTORY, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(INVENTORY_HEADER)
        writer.writerows(rows)
    return raw


def run(raw: Path, tmp_path: Path) -> dict:
    """Ejecuta el inventario y devuelve las filas tal como quedaron escritas en el CSV, indexadas por ruta."""
    out = tmp_path / "inventory.csv"
    bi.build_inventory(raw, out)
    with open(out, encoding="utf-8", newline="") as f:
        return {r["relative_path"]: r for r in csv.DictReader(f)}


def snapshot(root: Path) -> dict:
    return {p: (p.stat().st_size, p.stat().st_mtime_ns, hashlib.sha256(p.read_bytes()).hexdigest())
            for p in sorted(root.rglob("*")) if p.is_file()}


def test_one_row_per_file_and_exact_columns(tmp_path):
    raw = make_raw(tmp_path)
    out = tmp_path / "inventory.csv"
    bi.build_inventory(raw, out)
    with open(out, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    assert reader.fieldnames == bi.COLUMNS
    assert len(rows) == sum(1 for p in raw.rglob("*") if p.is_file())


def test_type_detected_by_signature_not_extension(tmp_path):
    rows = run(make_raw(tmp_path), tmp_path)
    assert rows["SEQ/S5C2-1000.jpeg.png"]["detected_file_type"] == "png"
    assert rows["notes.txt"]["detected_file_type"] == "text"
    assert rows["book.xlsx"]["detected_file_type"] == "xlsx"
    assert rows["blob.bin"]["detected_file_type"] == "unknown"
    assert rows["fake.jpeg"]["detected_file_type"] == "png"
    assert rows["renamed.jpeg"]["detected_file_type"] == "png"
    assert "extension_mismatch" in rows["renamed.jpeg"]["notes"]


def test_image_header_metadata(tmp_path):
    rows = run(make_raw(tmp_path), tmp_path)
    assert rows["SEQ/S5C2-1000.jpeg.png"]["dimensions"] == "7x3"
    assert rows["SEQ/S5C2-1000.jpeg.png"]["bit_depth"] == "8"
    assert rows["deep.tif"]["bit_depth"] == "16"


def test_xlsx_sheets_and_text_lines(tmp_path):
    rows = run(make_raw(tmp_path), tmp_path)
    assert rows["book.xlsx"]["sheet_names"] == "Sample1 - jpeg"
    assert rows["book.xlsx"]["row_count"] == "42"
    assert rows["notes.txt"]["row_count"] == "2"


def test_sequence_and_documented_labels(tmp_path):
    rows = run(make_raw(tmp_path), tmp_path)
    seq = rows["SEQ/S5C2-1033.jpeg.png"]
    assert (seq["sample"], seq["material"], seq["processing_variant"]) == ("5", "SIBAL fabric", "icmad")
    assert (seq["first_raw_id"], seq["last_raw_id"], seq["temporal_quality"]) == ("1000", "1033", "continuous")
    assert bi.SRC_MATERIAL in seq["source_of_metadata"]
    bit = rows["BIT/S1C1-500.jpeg"]
    assert (bit["sample"], bit["material"], bit["data_role"]) == ("", "", "bit_sequence")


def test_unsupported_and_unreadable_stay_blank_or_unknown(tmp_path):
    rows = run(make_raw(tmp_path), tmp_path)
    blob = rows["blob.bin"]
    assert (blob["data_role"], blob["confidence"], blob["dimensions"], blob["material"]) == ("unknown", "low", "", "")
    assert rows["fake.jpeg"]["availability"] == "unreadable"
    assert "extension_mismatch" not in rows["fake.jpeg"]["notes"]  # ilegible: no se afirma nada más
    unlisted = rows["deep.tif"]
    assert (unlisted["sample"], unlisted["data_role"]) == ("", "unknown")


def test_source_files_are_not_modified(tmp_path):
    raw = make_raw(tmp_path)
    before = snapshot(raw)
    bi.build_inventory(raw, tmp_path / "o.csv")
    assert snapshot(raw) == before


def test_missing_inventory_entries_and_duplicates(tmp_path):
    raw = make_raw(tmp_path)
    (raw / "SEQ" / "S5C2-1033.jpeg.png").unlink()
    (raw / "copy.png").write_bytes((raw / "SEQ" / "S5C2-1000.jpeg.png").read_bytes())
    rows = run(raw, tmp_path)
    assert rows["SEQ/S5C2-1033.jpeg.png"]["availability"] == "missing"
    assert "duplicate_sha256_of=" in rows["copy.png"]["notes"]
