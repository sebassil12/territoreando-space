"""API tests against the generated catalogs (run pipeline.build_catalog first)."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app import PROCESSED, create_app

pytestmark = pytest.mark.skipif(not (PROCESSED / "sequence_catalog.csv").is_file(),
                                reason="catalogs not built; run `uv run python -m pipeline.build_catalog`")


@pytest.fixture(scope="module")
def client():
    return TestClient(create_app())


def assert_envelope(body):
    assert set(body) == {"data", "source", "warnings", "quality"}
    assert body["source"]


def test_health(client):
    body = client.get("/api/health").json()
    assert_envelope(body)
    assert body["data"]["sequences"] == 21


def test_sequences_filter_and_tiff_gaps_flagged(client):
    body = client.get("/api/sequences", params={"file_type": "Mapped TIFF"}).json()
    assert_envelope(body)
    assert len(body["data"]) == 2
    assert {s["temporal_quality"] for s in body["data"]} == {"gap_detected"}


def test_variant_points_to_primary(client):
    body = client.get("/api/sequences/S4-C1-mapped-jpeg-part2").json()
    assert body["data"]["primary_sequence_id"] == "S4-C1-raw-jpeg-part2"
    assert any("Do not concatenate" in w for w in body["warnings"])


def test_unknown_ids_return_404(client):
    assert client.get("/api/sequences/NOPE").status_code == 404
    assert client.get("/api/sequences/NOPE/frames").status_code == 404
    assert client.get("/api/frames/NOPE").status_code == 404
    assert client.get("/api/metrics/NOPE").status_code == 404


def test_frames_paging_and_source(client):
    body = client.get("/api/sequences/S1-C2-raw-jpeg-part1/frames", params={"limit": 3, "step": 10}).json()
    assert_envelope(body)
    frames = body["data"]["frames"]
    assert [f["frame_index"] for f in frames] == [0, 10, 20]
    assert all(f["source_file"] == "saffire_inventory.csv" for f in frames)


def test_metrics_are_pixel_units_only(client):
    body = client.get("/api/metrics/S1-C2-raw-jpeg-part1").json()
    assert_envelope(body)
    units = set(body["data"]["units"].values())
    assert units <= {"intensity_0_255", "fraction", "pixels", "px"}
    assert not any(u in {"mm", "cm", "K", "C"} for u in units)


def test_calibrations_pending(client):
    body = client.get("/api/calibrations").json()
    assert {c["calibration_status"] for c in body["data"]} <= {"pending", "unavailable"}


def test_references_all_have_source(client):
    body = client.get("/api/references").json()
    assert body["quality"] == "published_reference"
    assert all(r["source"] and r["page"] for r in body["data"]["results"])


def test_missing_image_returns_warning_not_crash(tmp_path):
    c = TestClient(create_app(raw=tmp_path))  # empty raw dir: every image missing
    body = c.get("/api/frames/S1-C2-raw-jpeg-part1-f00000").json()
    assert body["data"]["image_available"] is False
    assert any("not found" in w for w in body["warnings"])
    assert c.get("/api/frames/S1-C2-raw-jpeg-part1-f00000/image").status_code == 404


def test_missing_references_file_degrades(tmp_path):
    c = TestClient(create_app(references=tmp_path / "absent.json"))
    assert c.get("/api/references").json()["data"]["results"] == []


def test_missing_catalogs_degrade(tmp_path):
    c = TestClient(create_app(processed=tmp_path))
    body = c.get("/api/sequences").json()
    assert body["data"] == [] and body["quality"] == "unavailable"


def test_tiff_served_as_png(client):
    if not Path("descompressed/SAFFIRE-II_S5C2_Image_Data_RAW2TIFF_Mapped").is_dir():
        pytest.skip("raw images not present")
    r = client.get("/api/frames/S5-C2-mapped-tiff-single-f00000/image")
    assert r.status_code == 200 and r.headers["content-type"] == "image/png"

