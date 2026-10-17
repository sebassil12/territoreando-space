"""Verify frontend-produced JSON against actual versioned API contracts."""

import json
import shutil
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.scenario_registry import REGISTRY_VERSION, scenario_models

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"


@pytest.fixture(scope="module")
def frontend_cases():
    if not shutil.which("node") or not (FRONTEND / "node_modules/typescript").is_dir():
        pytest.skip("Frontend contract check requires Node and existing npm dependencies.")
    registry = {"schema_version": "1", "registry_version": REGISTRY_VERSION,
                "models": [model.model_dump() for model in scenario_models()]}
    completed = subprocess.run(
        ["node", "tests/scenario-contract.mjs"], cwd=FRONTEND, input=json.dumps(registry),
        capture_output=True, text=True, check=True, timeout=30,
    )
    return json.loads(completed.stdout)


def test_frontend_empty_values_are_missing_in_actual_engine(frontend_cases, tmp_path):
    client = TestClient(create_app(processed=tmp_path, raw=tmp_path, references=tmp_path / "none.json"))
    response = client.post("/api/twin/scenarios/assess", json=frontend_cases["empty"])
    assert response.status_code == 200
    data = response.json()["data"]
    assert not data["selected_models"]
    assert data["candidates"][0]["missing_parameters"]
    assert data["candidates"][0]["compatibility"] == "undetermined"


def test_frontend_request_evaluates_only_existing_math_and_preserves_provenance(frontend_cases, tmp_path):
    client = TestClient(create_app(processed=tmp_path, raw=tmp_path, references=tmp_path / "none.json"))
    scenario = frontend_cases["configured"]
    assessment = client.post("/api/twin/scenarios/assess", json=scenario).json()["data"]
    response = client.post("/api/twin/scenarios/evaluate", json={
        "scenario": scenario, "assessment_fingerprint": assessment["fingerprint"],
    })
    assert response.status_code == 200
    assert response.json()["quality"] == "modelled_unvalidated"
    result = response.json()["data"]["results"][0]
    assert result["eta_f"] == 1 and result["discriminant"] == 1
    assert result["inputs"]["eta_g"]["origin"] == "user_assumption"
    assert result["source"]["page"] == 202 and result["scientifically_validated"] is False
    concurrent = client.post("/api/twin/scenarios/assess", json=frontend_cases["concurrent"]).json()["data"]
    assert not concurrent["selected_models"]
    assert concurrent["candidates"][0]["compatibility"] == "incompatible"
