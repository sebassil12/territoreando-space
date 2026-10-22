"""Pruebas de la capa de hallazgos: validación de citas, API de hallazgos, ranking y comparación."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend import analysis
from backend.app import PROCESSED, create_app
from backend.findings import Finding, ValidationContext, load_findings, validate_finding

FINDINGS = PROCESSED / "findings.json"
SEQUENCES = {
    "S5-C2-mapped-jpeg-part1": {"group": "S5", "camera": "C2", "file_type": "Mapped JPEG"},
    "S5-C2-mapped-tiff-single": {"group": "S5", "camera": "C2", "file_type": "Mapped TIFF"},
    "S9-C1-raw-jpeg-part1": {"group": "S9", "camera": "C1", "file_type": "Raw JPEG"},
}

pytestmark = pytest.mark.skipif(not (PROCESSED / "sequence_catalog.csv").is_file(), reason="catalogs not built")


def valid_finding(**overrides) -> dict:
    base = {
        "finding_id": "F-test-001", "title": "t", "summary": "s", "theme": "flame_spread", "observation": "o",
        "evidence_type": "published_result", "source_path": "descompressed/urban2019.pdf",
        "source_location": "p.177", "source_quote": "q", "confidence": "high", "confidence_rationale": "r",
        "safety_relevance": "low", "safety_relevance_rationale": "r", "data_status": "complete", "sample": "5",
        "value": 2.03, "unit": "mm/s", "related_sequences": ["S5-C2-mapped-jpeg-part1"],
    }
    return {**base, **overrides}


def errors_for(tmp_path, **overrides) -> list[str]:
    return validate_finding(Finding.from_dict(valid_finding(**overrides)), ValidationContext(SEQUENCES, tmp_path))


@pytest.fixture(scope="module")
def client():
    return TestClient(create_app())


def test_committed_findings_all_valid_and_cited():
    raw = json.loads(FINDINGS.read_text(encoding="utf-8"))["findings"]
    findings, warnings = load_findings(FINDINGS, ValidationContext({}, Path("descompressed")))
    assert len(findings) == len(raw) >= 10
    assert not [w for w in warnings if w.startswith("Finding excluded")]
    assert all(f.source_path and f.source_location and f.source_quote for f in findings)


def test_unknown_values_stay_empty_not_fabricated():
    raw = json.loads(FINDINGS.read_text(encoding="utf-8"))["findings"]
    for item in raw:
        if item["value"] is None:
            assert not item["unit"], item["finding_id"]
        assert item["value"] is None or item["evidence_type"] in {"published_result", "instrument_measurement"}


def test_validation_rejects_missing_source_and_bad_enums(tmp_path):
    assert any("source_location" in e for e in errors_for(tmp_path, source_location=""))
    assert any("invalid confidence" in e for e in errors_for(tmp_path, confidence="certain"))
    assert any("documented source" in e for e in errors_for(tmp_path, source_path="descompressed/nope.pdf"))


def test_validation_rejects_physical_units_on_image_metrics(tmp_path):
    errors = errors_for(tmp_path, evidence_type="derived_metric", value=None, unit="mm")
    assert any("physical unit" in e for e in errors)
    assert any("requires a published_result" in e for e in errors_for(tmp_path, evidence_type="image_observation"))


def test_validation_rejects_mixed_variants_and_foreign_samples(tmp_path):
    mixed = errors_for(tmp_path, related_sequences=["S5-C2-mapped-jpeg-part1", "S5-C2-mapped-tiff-single"])
    assert any("mix processing variants" in e for e in mixed)
    assert any("not from sample 5" in e for e in errors_for(tmp_path, related_sequences=["S9-C1-raw-jpeg-part1"]))


def test_missing_raw_dir_warns_but_loads(tmp_path):
    c = TestClient(create_app(raw=tmp_path / "absent"))
    body = c.get("/api/findings").json()
    assert body["data"] and any("Raw data directory not found" in w for w in body["warnings"])


def test_missing_findings_file_degrades(tmp_path):
    body = TestClient(create_app(processed=tmp_path)).get("/api/findings/ranked").json()
    assert body["data"]["findings"] == [] and body["quality"] == "unavailable"
    assert any("not found" in w for w in body["warnings"])


def test_findings_filters_and_404(client):
    body = client.get("/api/findings", params={"sample": "9", "evidence_type": "published_result"}).json()
    assert body["data"] and {f["sample"] for f in body["data"]} == {"9"}
    assert client.get("/api/findings/NOPE").status_code == 404


def test_detail_links_gap_sequences_with_warnings(client):
    body = client.get("/api/findings/F-data-004").json()
    related = body["data"]["related_sequences"]
    assert {r["temporal_quality"] for r in related} == {"gap_detected"}
    assert all(any("temporal gap" in w for w in r["warnings"]) for r in related)


def test_related_sequences_never_mix_variants(client):
    for f in client.get("/api/findings").json()["data"]:
        detail = client.get(f"/api/findings/{f['finding_id']}").json()["data"]
        channels = {}
        for r in detail["related_sequences"]:
            channels.setdefault((r["group"], r["camera"]), set()).add(r["file_type"])
        assert all(len(types) == 1 for types in channels.values()), f["finding_id"]


def test_ranking_reproducible_and_breakdown_sums(client):
    first = client.get("/api/findings/ranked").json()["data"]
    second = client.get("/api/findings/ranked").json()["data"]
    assert [f["finding_id"] for f in first["findings"]] == [f["finding_id"] for f in second["findings"]]
    assert first["ranking_criteria"]["tie_break"]
    for f in first["findings"]:
        assert f["score"] == sum(item["points"] for item in f["score_breakdown"])
    scores = [f["score"] for f in first["findings"]]
    assert scores == sorted(scores, reverse=True)


def test_ranking_penalises_conflicting_status():
    complete = Finding.from_dict(valid_finding())
    conflicting = Finding.from_dict(valid_finding(finding_id="F-test-002", data_status="conflicting"))
    ranked = analysis.rank_findings([conflicting, complete])
    assert [r["finding_id"] for r in ranked] == ["F-test-001", "F-test-002"]


def test_compare_different_materials_is_limited(client):
    body = client.get("/api/compare", params={"samples": "5,9"}).json()
    data = body["data"]
    assert data["comparison_status"] == "limited" == body["quality"]
    assert "material" in data["differing_factors"]
    assert "oxygen_pct" in data["missing_factors"]
    assert "conclusion" not in json.dumps(data).lower()


def test_compare_flags_s6_airflow_conflict(client):
    data = client.get("/api/compare", params={"finding_ids": "F-urban2019-001,F-data-001"}).json()["data"]
    assert data["samples"] == ["5", "6"]
    assert "airflow_cm_s" in data["conflicting_factors"]
    airflow = next(f for f in data["factors"] if f["factor"] == "airflow_cm_s")
    assert airflow["values"]["6"] is None


def test_compare_unknown_sample_404(client):
    assert client.get("/api/compare", params={"samples": "5,42"}).status_code == 404
    assert client.get("/api/compare", params={"samples": "5"}).status_code == 422


def test_conditions_keep_unknowns_empty(client):
    rows = {r["sample"]: r for r in client.get("/api/conditions").json()["data"]}
    assert rows["6"]["airflow_cm_s_dod"] == 30 and rows["6"]["airflow_cm_s_urban2019"] == 25
    assert rows["9"]["oxygen_pct"] is None and rows["9"]["airflow_cm_s_urban2019"] is None


NTRS_FINDINGS = {"F-ferkul2017-001", "F-ferkul2017-002", "F-ferkul2017-003", "F-ferkul2017-004", "F-bass2-001",
                 "F-urban2021-001", "F-urban2021-002"}


def test_external_ntrs_findings_load_with_published_reference_links():
    refs = json.loads((PROCESSED.parent / "scientific_reference_results.json").read_text(encoding="utf-8"))
    urls = {source["url"] for source in refs["sources"].values() if source.get("url")}
    ids = {r["id"] for r in refs["results"]}
    findings, _ = load_findings(FINDINGS, ValidationContext({}, Path("descompressed")))
    loaded = {f.finding_id: f for f in findings}
    assert NTRS_FINDINGS <= loaded.keys()
    for fid in NTRS_FINDINGS:
        assert loaded[fid].source_path in urls, fid
        assert loaded[fid].reference_id is None or loaded[fid].reference_id in ids, fid
    assert loaded["F-urban2021-001"].data_status == "conflicting"
