"""Twin API contracts, independent of catalogs, publications on disk, and images."""

import json

import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.simulation_contracts import MAX_CASES_PER_REQUEST, MODEL_ID


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    empty = tmp_path_factory.mktemp("no_evidence_assets")
    return TestClient(create_app(processed=empty, raw=empty, references=empty / "absent.json"))


def request_body():
    return {
        "schema_version": "1", "model_id": MODEL_ID, "mode": "dimensionless",
        "flow_configuration": "opposed", "parameter_origin": "user_assumption",
        "cases": [{"eta_g": 0.0, "radiation_number": 0.0}],
    }


def envelope(response, status=200):
    assert response.status_code == status
    body = response.json()
    assert set(body) == {"data", "source", "warnings", "quality"}
    assert "20040053557.pdf" in body["source"] and "p.202" in body["source"]
    assert body["warnings"]
    assert body["quality"] == ("modelled_unvalidated" if status == 200 else "unavailable")
    return body


def test_model_metadata_and_equation_provenance_without_assets(client):
    model = envelope(client.get("/api/twin/models"))["data"][0]
    assert model["model_id"] == MODEL_ID
    assert model["mode"] == "dimensionless" and model["flow_configuration"] == "opposed"
    assert model["equation_verified_against_source"] is True
    assert model["scientifically_validated"] is False
    assert model["source"]["page"] == 202 and model["source"]["definition_page"] == 201
    assert model["source"]["equation"] == "(5), thin limit"
    assert model["source"]["url"].startswith("https://ntrs.nasa.gov/")
    assert set(model["definitions"]) == {"eta_g", "eta_f", "radiation_number"}
    assert model["max_cases_per_request"] == MAX_CASES_PER_REQUEST


def test_evaluation_returns_ordered_math_results_with_no_physical_diagnosis(client):
    q = request_body()
    q["cases"] = [
        {"eta_g": 0.0, "radiation_number": 0.0},
        {"eta_g": 1.0, "radiation_number": 1.0},
        {"eta_g": 2.0, "radiation_number": 2.25},
        {"eta_g": 0.0, "radiation_number": 1.0},
    ]
    body = envelope(client.post("/api/twin/evaluate", json=q))
    data = body["data"]
    assert data["scientifically_validated"] is False
    assert data["parameter_origin"] == "user_assumption"
    assert data["model_version"] == "1" and data["schema_version"] == "1"
    assert set(data["units"].values()) == {"dimensionless"}
    results = data["results"]
    assert [r["eta_f"] for r in results] == [1.0, 0.0, -0.5, None]
    assert [r["model_status"] for r in results] == [
        "positive_branch", "zero_branch", "negative_branch", "no_real_branch",
    ]
    assert [{k: r[k] for k in ("eta_g", "radiation_number")} for r in results] == q["cases"]
    assert all(set(r) == {"eta_g", "radiation_number", "eta_f", "discriminant", "model_status"} for r in results)
    assert any("extinction" in w and "not" in w for w in body["warnings"])
    assert any("conflicts" in w for w in body["warnings"])
    assert client.post("/api/twin/evaluate", json=q).json() == body


def test_unknown_model_returns_404_envelope(client):
    q = request_body()
    q["model_id"] = "urban"
    envelope(client.post("/api/twin/evaluate", json=q), 404)


@pytest.mark.parametrize("field,value", [
    ("mode", "dimensional"), ("flow_configuration", "concurrent"),
    ("schema_version", "2"), ("parameter_origin", "validated"), ("cases", []),
    ("material", "PMMA"), ("sequence_id", "S1-C2-raw-jpeg-part1"),
])
def test_unsupported_modes_and_extra_inputs_are_rejected(client, field, value):
    q = request_body()
    q[field] = value
    envelope(client.post("/api/twin/evaluate", json=q), 422)


@pytest.mark.parametrize("field", list(request_body()))
def test_required_inputs_have_no_defaults(client, field):
    q = request_body()
    del q[field]
    envelope(client.post("/api/twin/evaluate", json=q), 422)


@pytest.mark.parametrize("field", ["eta_g", "radiation_number"])
@pytest.mark.parametrize("value", [-1.0, True, "1", None])
def test_case_values_are_strict_nonnegative_numbers(client, field, value):
    q = request_body()
    q["cases"][0][field] = value
    envelope(client.post("/api/twin/evaluate", json=q), 422)


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -float("inf")])
def test_nonfinite_raw_json_has_serializable_error_envelope(client, value):
    q = request_body()
    q["cases"][0]["radiation_number"] = value
    response = client.post("/api/twin/evaluate", content=json.dumps(q), headers={"Content-Type": "application/json"})
    body = envelope(response, 422)
    json.dumps(body, allow_nan=False)


def test_malformed_json_uses_twin_error_envelope(client):
    envelope(client.post("/api/twin/evaluate", content="{", headers={"Content-Type": "application/json"}), 422)


def test_case_limit_and_numerical_overflow_are_explicit(client):
    q = request_body()
    q["cases"] *= MAX_CASES_PER_REQUEST + 1
    envelope(client.post("/api/twin/evaluate", json=q), 422)
    q = request_body()
    q["cases"].append({"eta_g": 1e308, "radiation_number": 0.0})
    body = envelope(client.post("/api/twin/evaluate", json=q), 422)
    assert body["data"]["case_index"] == 1
    assert "floating-point" in body["data"]["error"]
    assert "results" not in body["data"]  # Failed batches return no partial evaluations.


def test_openapi_exposes_versioned_contract_and_no_case_defaults(client):
    schema = client.get("/openapi.json").json()
    assert "/api/twin/evaluate" in schema["paths"] and "/api/twin/models" in schema["paths"]
    request_schema = schema["components"]["schemas"]["TwinEvaluationRequest"]
    assert set(request_schema["required"]) == set(request_body())
    assert request_schema["additionalProperties"] is False
    for field in schema["components"]["schemas"]["TwinCase"]["properties"].values():
        assert "default" not in field


def test_existing_api_validation_keeps_its_contract(client):
    response = client.post("/api/assistant", json={})
    assert response.status_code == 422 and "detail" in response.json()
    assert client.get("/api/references").json()["quality"] == "published_reference"
