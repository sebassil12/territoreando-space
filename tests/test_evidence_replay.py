"""Comparison never promotes catalogs or illustrative motion to physical validation."""

import copy
import json
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from backend.app import create_app
from backend.evidence_replay import compile_replay, sequence_audit
from backend.playback import compile_playback

ROOT = Path(__file__).resolve().parents[1]
REFERENCES = ROOT / "data/scientific_reference_results.json"


def reference_data():
    return json.loads(REFERENCES.read_text())


def test_replay_api_retains_variants_and_refuses_temporal_or_physical_registration(tmp_path):
    client = TestClient(create_app(raw=tmp_path))
    body = client.get("/api/twin/evidence-replay").json()
    assert body["source"] and body["warnings"] and body["quality"] == "qualitative_only"
    cases = {case["case_id"]: case for case in body["data"]["cases"]}
    assert cases["saffire1"]["sequences"] == cases["saffire3"]["sequences"] == []
    sample = cases["saffire2-s5"]
    assert sample["image_mapping"]["page"] == 2 and sample["image_mapping"]["file"]
    assert len(sample["sequences"]) == 3
    assert {seq["file_type"] for seq in sample["sequences"]} == {"Mapped JPEG", "Mapped TIFF", "ICMAD PNG"}
    for seq in sample["sequences"]:
        assert seq["group"] == "S5" and seq["camera"] == "C2"
        assert seq["local_frame_count"] == 0 and seq["asset_status"] == "unavailable"
        assert seq["calibration_status"] != "validated"
    tiff = next(seq for seq in sample["sequences"] if seq["file_type"] == "Mapped TIFF")
    assert tiff["n_gaps_gt_2x"] == 3 and tiff["max_diff_ms"] == 157454
    for case in cases.values():
        assert case["synchronization"] == {"status": "unavailable", "enabled": False, "time_transform": None}
        assert case["reconstruction"] == {"status": "schematic_only", "trajectory": None, "fidelity_error": None}
        assert case["geometry"]["status"] == "source_checked_not_camera_calibration"
        assert case["geometry"]["label"] == "Published reference"
        assert case["geometry"]["file"] and case["geometry"]["page"] == 30
        assert case["reference_audit"]["status"] == "exact_vf_lp_pair_unverified"


def test_startup_checks_files_instead_of_stale_catalog_availability(tmp_path):
    sequence = {"sequence_id": "example"}
    frames = [{"relative_path": "present.png", "availability": "missing"},
              {"relative_path": "absent.png", "availability": "available"}]
    Image.new("RGB", (2, 2)).save(tmp_path / "present.png")
    audit = sequence_audit(sequence, frames, tmp_path)
    assert audit["local_frame_count"] == 1 and audit["catalog_frame_count"] == 2
    assert audit["asset_status"] == "partial"
    assert sequence_audit(sequence, frames[:1], tmp_path)["asset_status"] == "available"
    assert sequence_audit(sequence, [], tmp_path)["asset_status"] == "unavailable"


def test_image_route_rechecks_availability_after_startup(tmp_path):
    client = TestClient(create_app(raw=tmp_path))
    frame = client.get("/api/sequences/S5-C2-mapped-jpeg-part1/frames?limit=1").json()["data"]["frames"][0]
    endpoint = f"/api/frames/{frame['frame_id']}"
    assert client.get(endpoint).json()["data"]["image_available"] is False
    path = tmp_path / frame["relative_path"]
    path.parent.mkdir(parents=True)
    Image.new("RGB", (2, 2)).save(path)
    assert client.get(endpoint).json()["data"]["image_available"] is True
    assert client.get(endpoint + "/image").headers["content-type"] == "image/jpeg"
    path.unlink()
    assert client.get(endpoint + "/image").status_code == 404


def test_missing_catalogs_references_and_citations_degrade_without_guessing(tmp_path):
    client = TestClient(create_app(processed=tmp_path, raw=tmp_path, references=REFERENCES))
    cases = client.get("/api/twin/evidence-replay").json()["data"]["cases"]
    assert cases and all(not case["sequences"] for case in cases)
    absent = TestClient(create_app(processed=tmp_path, raw=tmp_path, references=tmp_path / "absent.json"))
    body = absent.get("/api/twin/evidence-replay").json()
    assert body["data"]["cases"] == [] and body["quality"] == "unavailable"
    refs = reference_data()
    refs["sources"] = {}
    cases = compile_replay(refs, compile_playback(refs), {})["cases"]
    assert all(case["geometry"] is None and case["image_mapping"] is None for case in cases)
    assert all(case["reference_evidence"] == {} for case in cases)


def test_metadata_cannot_automatically_validate_calibration_or_enable_sync():
    refs = reference_data()
    refs["playback_cases"][2]["replay_audit"]["reference_status"] = "verified"
    seq = {"sequence_id": "synthetic", "group": "S5", "camera": "C2", "sequence_role": "primary",
           "calibration_status": "validated", "temporal_quality": "continuous"}
    wrong_sample = {**seq, "group": "S6"}
    wrong_camera = {**seq, "camera": "C3"}
    bit = {**seq, "sequence_role": "bit_sequence"}
    cases = compile_replay(refs, compile_playback(refs),
                           {"match": seq, "other": wrong_sample, "camera": wrong_camera, "bit": bit})["cases"]
    sample = cases[2]
    assert sample["sequences"] == [seq]
    assert sample["synchronization"]["enabled"] is False
    assert sample["reconstruction"]["trajectory"] is None
    assert sample["reconstruction"]["fidelity_error"] is None


def test_reference_evidence_is_not_a_trajectory_and_keeps_exact_lineage():
    refs = reference_data()
    before = copy.deepcopy(refs)
    playback = compile_playback(refs)
    cases = compile_replay(refs, playback, {})["cases"]
    for old, new in zip(playback["cases"], cases):
        assert new["reference_evidence"] == old["evidence"]
        assert "trajectory" not in new
        assert new["reconstruction"]["trajectory"] is None
    assert refs == before
