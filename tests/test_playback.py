"""Published-reference playback is a derived local window, never a model validation."""

import copy
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.playback import QUALITY, compile_playback

REFERENCE = Path(__file__).resolve().parents[1] / "data/scientific_reference_results.json"


@pytest.fixture
def references():
    return json.loads(REFERENCE.read_text())


def test_catalog_derives_units_bounds_and_preserves_source(references):
    catalog = compile_playback(references)
    assert catalog["schema_version"] == "1"
    assert {case["case_id"] for case in catalog["cases"]} == {"saffire1", "saffire3", "saffire2-s5"}
    for case in catalog["cases"]:
        assert case["status"] == "available" and case["quality"] == QUALITY
        vf, lp = case["evidence"]["vf"], case["evidence"]["lp"]
        trajectory = case["trajectory"]
        assert vf["label"] == lp["label"] == "Published reference"
        assert vf["file"] == lp["file"] == "descompressed/urban2019.pdf"
        assert case["airflow"]["direction"] == "concurrent"
        assert case["airflow"]["condition"] == vf["flow"]
        assert case["airflow"]["reference_id"] == vf["reference_id"]
        assert case["airflow"]["page"] == vf["page"]
        assert vf["page"] == lp["page"] and vf["url"].startswith("https://doi.org/")
        assert trajectory["lp_mm"] == lp["value"] * 10
        assert trajectory["duration_s"] == pytest.approx(trajectory["lp_mm"] / vf["value"])
        start, end = trajectory["anchors"]
        assert start["x_base_mm"] == 0 and start["x_front_mm"] == trajectory["lp_mm"]
        assert end["x_front_mm"] - end["l_p_mm"] == end["x_base_mm"]
        assert len(trajectory["anchors"]) == 2
        assert "not_independently_reverified" in case["source_review"]
        assert any("not measured continuous" in warning for warning in case["warnings"])
    s3 = next(case for case in catalog["cases"] if case["case_id"] == "saffire3")
    assert s3["evidence"]["lp"]["transcribed_from"]["field"] == "notes"


@pytest.mark.parametrize(("field", "value"), [
    ("value", None), ("value", 0), ("value", -1), ("value", True), ("value", float("inf")),
    ("unit", "m/s"), ("page", None), ("page", True), ("source", "unknown"), ("experiment", "different"),
])
def test_invalid_evidence_blocks_only_affected_case(references, field, value):
    row = next(row for row in references["results"] if row["id"] == "saffire1-spread-rate")
    row[field] = value
    cases = compile_playback(references)["cases"]
    blocked = next(case for case in cases if case["case_id"] == "saffire1")
    assert blocked["status"] == "unavailable" and blocked["trajectory"] is None
    assert blocked["missing_requirements"] and blocked["quality"] == "unavailable"
    assert sum(case["status"] == "available" for case in cases) == 2


def test_missing_and_duplicate_references_do_not_select_arbitrary_value(references):
    row = next(row for row in references["results"] if row["id"] == "saffire1-spread-rate")
    for rows in ([item for item in references["results"] if item != row], references["results"] + [copy.deepcopy(row)]):
        cases = compile_playback({**references, "results": rows})["cases"]
        case = next(case for case in cases if case["case_id"] == "saffire1")
        assert case["status"] == "unavailable"
        assert "ambiguous" in case["missing_requirements"][0]


def test_playback_endpoints_and_no_reference_fallback(tmp_path):
    client = TestClient(create_app(processed=tmp_path, raw=tmp_path, references=REFERENCE))
    catalog = client.get("/api/twin/playback-cases").json()
    assert catalog["quality"] == QUALITY and catalog["source"] and catalog["warnings"]
    for case in catalog["data"]["cases"]:
        response = client.get(f"/api/twin/playback-cases/{case['case_id']}")
        assert response.status_code == 200 and response.json()["data"] == case
    assert client.get("/api/twin/playback-cases/unknown").status_code == 404
    absent = TestClient(create_app(processed=tmp_path, raw=tmp_path, references=tmp_path / "absent.json"))
    response = absent.get("/api/twin/playback-cases").json()
    assert response["data"]["cases"] == [] and response["quality"] == "unavailable"


@pytest.mark.parametrize("direction", [None, "opposed", "unknown"])
def test_undocumented_airflow_is_not_assumed(references, direction):
    references["playback_cases"][0]["airflow_direction"] = direction
    case = compile_playback(references)["cases"][0]
    assert case["status"] == "unavailable" and case["trajectory"] is None
    assert case["airflow"] is None
    assert "documented concurrent airflow" in case["missing_requirements"][0]
