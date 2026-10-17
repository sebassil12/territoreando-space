"""Synthetic checks for the offline S5/C2 audit; these do not validate physics."""

import io
from zipfile import ZipFile

import pytest
from PIL import Image

from pipeline.s5c2_timing import CHANNELS, audit_timing, continuity
from pipeline.sensor_workbook import NS, REL, workbook_rows
from pipeline.validate_s5c2 import build_audit, extract_frame, inspect_source


def test_cached_cells_keep_blanks_and_original_rows(tmp_path):
    path = tmp_path / "sensor.xlsx"
    with ZipFile(path, "w") as archive:
        archive.writestr("xl/workbook.xml", f'<workbook xmlns="{NS[1:-1]}" xmlns:r="{REL[1:-1]}">'
                         '<sheets><sheet name="Calibrated Data" r:id="rId7"/></sheets></workbook>')
        archive.writestr("xl/_rels/workbook.xml.rels", '<Relationships><Relationship Id="rId7" '
                         'Target="worksheets/actual.xml"/></Relationships>')
        archive.writestr("xl/sharedStrings.xml", f'<sst xmlns="{NS[1:-1]}"><si><t>Epoch Time</t></si></sst>')
        archive.writestr("xl/worksheets/actual.xml", f'<worksheet xmlns="{NS[1:-1]}"><sheetData>'
                         '<row r="1"><c r="B1" t="s"><v>0</v></c></row>'
                         '<row r="3"><c r="A3"><f>1+2</f><v>3</v></c><c r="B3"><v>1000</v></c></row>'
                         '<row r="9"><c r="A9"><f>1+2</f></c><c r="C9" t="inlineStr">'
                         '<is><t>Text</t></is></c></row></sheetData></worksheet>')
    assert list(workbook_rows(path)) == [(1, {"B": "Epoch Time"}), (3, {"A": "3", "B": "1000"}),
                                         (9, {"A": "", "C": "Text"})]


def test_candidate_alignment_preserves_event_bracket_and_unverified_status():
    rows = [(3, {"A": "0", "B": "1000", "AR": "0", "AW": "0", "BE": "0"}),
            (4, {"A": ".033", "B": "1033", "AR": "0", "AW": "0", "BE": "1"}),
            (5, {"A": ".066", "B": "1066", "AR": "1", "AW": "1", "BE": "0"})]
    frames = [{"raw_id": 1033}, {"raw_id": 1072}]
    report = audit_timing(frames, rows, {**CHANNELS, "A": "Elapsed Time (s)", "B": "Epoch Time"})
    assert report["events"]["Igniter Power Enable"][0]["previous_epoch_ms"] == 1033
    assert report["events"]["Igniter Power Enable"][0]["epoch_ms"] == 1066
    assert frames[0]["nearest_sensor_row"] == 4
    assert frames[1]["within_sensor_coverage"] is False
    assert report["frames_outside_sensor_coverage"] == 1
    assert report["optical_ignition_epoch_ms"] is None
    assert report["reconstruction_time_transform"] is None
    assert report["clock_drift_verified"] is False


def test_missing_channels_do_not_establish_registration():
    assert audit_timing([], [], CHANNELS)["status"] == "unavailable"
    assert audit_timing([], [(3, {"B": "1000"})], {"BE": "Other camera"})["status"] == "unavailable"


def test_continuity_reports_gaps_and_duplicates():
    result = continuity([1000, 1033, 1066, 1066, 1266])
    assert result["duplicate_ids"] == 1
    assert result["gaps_over_twice_median"] == 1


def test_extraction_retains_original_bytes_and_rejects_other_variants(tmp_path):
    image = io.BytesIO()
    Image.new("RGB", (4, 2)).save(image, format="JPEG")
    path = tmp_path / "images.zip"
    with ZipFile(path, "w") as archive:
        archive.writestr("S5C2-1000.jpeg", image.getvalue())
        archive.writestr("../S5C2-1033.jpeg", image.getvalue())
        archive.writestr("S5C1-1000.jpeg", image.getvalue())
        archive.writestr("S5C2-1000.png", image.getvalue())
    with ZipFile(path) as archive:
        result = extract_frame(archive, archive.infolist()[0], tmp_path / "frames")
        for member in archive.infolist()[1:]:
            with pytest.raises(ValueError, match="Unexpected image entry"):
                extract_frame(archive, member, tmp_path / "frames")
    assert (tmp_path / "frames/S5C2-1000.jpeg").read_bytes() == image.getvalue()
    assert result["processing_variant"] == "onboard_jpeg"
    assert result["width_px"] == 4
    assert inspect_source(path, ("test", path.stat().st_size))["crc_ok"] is True
    assert inspect_source(path, ("test", 1))["status"] == "invalid"


def test_missing_inputs_produce_blocked_report_without_inventing_observations(tmp_path):
    report = build_audit(tmp_path)
    assert report["images"]["combined"]["count"] == 0
    assert all(source["status"] == "missing" for source in report["sources"])
    assert report["comparison"] == {"status": "blocked", "trajectory": None, "fidelity_error": None}
    assert not report["calibration"]["physical_measurements_enabled"]
    assert report["warnings"]
