"""Observable routing, refusal and provenance contracts; no experimental validation."""

# File-size exception: these focused contract tests cover the same versioned scenario API without scientific fixtures.
import copy
import json

import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.scenario_contracts import ScenarioRequest
from backend.scenario_engine import assess_scenario
from backend.scenario_registry import CONCURRENT_ID, CRITICAL_FLOW_ID, DIMENSIONLESS_ID, scenario_models
from backend.simulation_contracts import MODEL_ID

ASSESS = "/api/twin/scenarios/assess"
EVALUATE = "/api/twin/scenarios/evaluate"


def declaration(value):
    return {"state": "provided", "value": value, "origin": "user_assumption",
            "source_refs": [], "scope": {}}


def quantity(value, unit="dimensionless"):
    return {**declaration(value), "unit": unit}


def scenario():
    return {
        "schema_version": "1", "scenario_id": "synthetic-math-case", "revision": 1,
        "scenario_kind": "hypothetical", "requested_outputs": ["dimensionless_branch"],
        "model_preference": "auto",
        "environment": {"airflow": {"direction": declaration("opposed")},
                        "gravity_regime": declaration("microgravity")},
        "fuel": {"geometry": {}, "thermal_regime": declaration("thermally_thin")},
        "model_inputs": {DIMENSIONLESS_ID: {
            "eta_g": quantity(0.0), "radiation_number": quantity(0.0),
        }},
        "assumptions": {"steady_reduced_balance": declaration("acknowledged")},
        "evidence_context": {},
    }


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    empty = tmp_path_factory.mktemp("scenario_without_assets")
    return TestClient(create_app(processed=empty, raw=empty, references=empty / "missing.json"))


def envelope(response, status=200, quality="unavailable"):
    assert response.status_code == status, response.text
    body = response.json()
    assert set(body) == {"data", "source", "warnings", "quality"}
    assert body["warnings"] and "20040053557.pdf" in body["source"]
    assert body["quality"] == quality
    json.dumps(body, allow_nan=False)
    return body["data"]


def assess(client, q):
    return envelope(client.post(ASSESS, json=q))


def evaluate(client, q, status=200):
    fingerprint = assess(client, q)["fingerprint"]
    return envelope(client.post(EVALUATE, json={"scenario": q, "assessment_fingerprint": fingerprint}),
                    status, "modelled_unvalidated" if status == 200 else "unavailable")


def candidate(data, mid):
    return next(c for c in data["candidates"] if c["model"]["model_id"] == mid)


def codes(data, mid):
    return {r["code"] for r in candidate(data, mid)["reasons"]}


def test_registry_has_three_models_and_preserves_equation_evidence(client):
    data = envelope(client.get("/api/twin/scenario-models"))
    models = {m["model_id"]: m for m in data["models"]}
    assert set(models) == {DIMENSIONLESS_ID, CRITICAL_FLOW_ID, CONCURRENT_ID}
    assert models[DIMENSIONLESS_ID]["evaluator_id"] == MODEL_ID
    assert models[DIMENSIONLESS_ID]["source"]["page"] == 202
    assert models[CRITICAL_FLOW_ID]["source"]["page"] == 28
    assert models[CONCURRENT_ID]["source"]["page"] is None
    assert models[CONCURRENT_ID]["evidence"]["equation"] == "verified_html_page_unresolved"
    assert all(m["evidence"]["experimental_validation"] == "unvalidated" for m in models.values())
    assert models[CRITICAL_FLOW_ID]["implemented"] is False
    assert models[CONCURRENT_ID]["implemented"] is False
    models[DIMENSIONLESS_ID]["implemented"] = False
    assert scenario_models()[0].implemented is True


@pytest.mark.parametrize("preference", ["auto", DIMENSIONLESS_ID])
def test_selects_only_available_exact_output_and_retains_inputs(client, preference):
    q = scenario()
    q["model_preference"] = preference
    data = evaluate(client, q)
    assessment = data["assessment"]
    assert assessment["selected_models"] == {"dimensionless_branch": DIMENSIONLESS_ID}
    assert assessment["provenance"]["model_inputs"][DIMENSIONLESS_ID]["eta_g"]["origin"] == "user_assumption"
    result = data["results"][0]
    assert result["eta_f"] == 1.0 and result["model_status"] == "positive_branch"
    assert result["evaluator_id"] == MODEL_ID
    assert result["source"]["file"] == "20040053557.pdf" and result["source"]["page"] == 202
    assert result["scientifically_validated"] is False
    assert result["result_kind"] == "mathematical_dimensionless"
    assert set(result["units"].values()) == {"dimensionless"}


@pytest.mark.parametrize("flow,thermal,gravity,path", [
    ("concurrent", "thermally_thin", "microgravity", "environment.airflow.direction"),
    ("opposed", "thermally_thick", "microgravity", "fuel.thermal_regime"),
    ("opposed", "thermally_thin", "normal_gravity", "environment.gravity_regime"),
])
def test_known_context_mismatch_is_incompatible(client, flow, thermal, gravity, path):
    q = scenario()
    q["environment"]["airflow"]["direction"] = declaration(flow)
    q["environment"]["gravity_regime"] = declaration(gravity)
    q["fuel"]["thermal_regime"] = declaration(thermal)
    data = assess(client, q)
    c = candidate(data, DIMENSIONLESS_ID)
    assert c["compatibility"] == "incompatible" and c["readiness"] == "blocked"
    assert any(r["code"] == "incompatible_scenario" and r["field_path"] == path for r in c["reasons"])
    assert data["selected_models"] == {}
    blocked = evaluate(client, q, 422)
    assert "results" not in blocked


def test_unknown_context_never_uses_a_physical_default(client):
    q = scenario()
    q["environment"]["airflow"] = {}
    q["environment"].pop("gravity_regime")
    q["fuel"].pop("thermal_regime")
    q["assumptions"] = {}
    data = assess(client, q)
    c = candidate(data, DIMENSIONLESS_ID)
    assert c["compatibility"] == "undetermined"
    assert len([r for r in c["reasons"] if r["code"] == "missing_context"]) == 4
    assert not data["permitted_outputs"]


@pytest.mark.parametrize("state", ["absent", "missing", "conflicting"])
def test_missing_parameters_do_not_become_zero(client, state):
    q = scenario()
    inputs = q["model_inputs"][DIMENSIONLESS_ID]
    if state == "absent":
        inputs.pop("radiation_number")
    else:
        inputs["radiation_number"] = {**quantity(None), "state": state}
    data = assess(client, q)
    c = candidate(data, DIMENSIONLESS_ID)
    assert c["missing_parameters"] == [f"model_inputs.{DIMENSIONLESS_ID}.radiation_number"]
    assert "missing_parameter" in codes(data, DIMENSIONLESS_ID)
    if state == "conflicting":
        assert "conflicting_sources" in codes(data, DIMENSIONLESS_ID)
    assert not data["selected_models"]


def complete_research(q, mid):
    model = next(m for m in scenario_models() if m.model_id == mid)
    q["model_preference"] = mid
    q["requested_outputs"] = [model.available_output]
    q["environment"]["airflow"]["direction"] = declaration(model.flow_configuration)
    for key in model.required_assumptions:
        q["assumptions"][key] = declaration("acknowledged")
    # Explicit synthetic mathematical inputs, not a material or experiment preset.
    q["model_inputs"][mid] = {key: quantity(1.0, unit) for key, unit in model.required_parameters.items()}
    temperatures = ("Tf", "Tv", "T_infinity") if mid == CRITICAL_FLOW_ID else ("Tf", "Tp", "To")
    for key, value in zip(temperatures, (3.0, 2.0, 1.0), strict=True):
        q["model_inputs"][mid][key] = quantity(value, "K")
    if mid == CONCURRENT_ID:
        q["model_inputs"][mid]["solid_areal_mass"] = quantity(1.0, "kg/m2")


@pytest.mark.parametrize("mid", [CRITICAL_FLOW_ID, CONCURRENT_ID])
def test_research_models_stay_blocked_with_complete_hypothetical_inputs(client, mid):
    q = scenario()
    complete_research(q, mid)
    data = assess(client, q)
    c = candidate(data, mid)
    assert c["compatibility"] == "compatible"
    assert c["missing_parameters"] == []
    assert c["readiness"] == "blocked" and data["selected_models"] == {}
    assert {"model_not_implemented", "reproduction_not_established"} <= codes(data, mid)
    if mid == CONCURRENT_ID:
        assert "source_page_unverified" in codes(data, mid)
    assert "results" not in evaluate(client, q, 422)


def test_research_blockers_include_all_missing_parameters_and_evidence(client):
    data = assess(client, scenario())
    critical = candidate(data, CRITICAL_FLOW_ID)
    assert len(critical["missing_parameters"]) == 7
    urban = candidate(data, CONCURRENT_ID)
    assert len(urban["missing_parameters"]) == 7  # Six inputs and one explicit alternative group.
    assert any("solid_areal_mass" in p and "solid_density" in p for p in urban["missing_parameters"])
    assert {"model_not_implemented", "reproduction_not_established",
            "source_page_unverified", "missing_parameter"} <= codes(data, CONCURRENT_ID)


@pytest.mark.parametrize("output", ["critical_flow_speed", "concurrent_spread_speed", "flame_shape", "fire_risk"])
def test_dimensional_or_visual_request_never_falls_back_to_dimensionless(client, output):
    q = scenario()
    q["requested_outputs"] = [output]
    q["model_preference"] = DIMENSIONLESS_ID
    data = assess(client, q)
    assert data["blocked_outputs"] == [output] and data["selected_models"] == {}
    assert any(r["code"] == "output_not_supported" for r in data["outputs"][0]["reasons"])


def test_explicit_unavailable_preference_never_routes_to_existing_model(client):
    q = scenario()
    q["model_preference"] = CRITICAL_FLOW_ID
    assert not assess(client, q)["selected_models"]
    assert "results" not in evaluate(client, q, 422)


def test_mixed_output_request_reports_each_disposition_and_returns_no_partial_results(client):
    q = scenario()
    q["requested_outputs"].append("concurrent_spread_speed")
    data = assess(client, q)
    assert data["permitted_outputs"] == ["dimensionless_branch"]
    assert data["blocked_outputs"] == ["concurrent_spread_speed"]
    assert "results" not in evaluate(client, q, 422)


def cited_input(q):
    record = q["model_inputs"][DIMENSIONLESS_ID]["eta_g"]
    record["origin"] = "documented"
    record["source_refs"] = [{"source_id": "claimed-input", "file": "claimed.pdf", "page": 8,
                              "locator": "Table 2"}]
    return record


def test_user_citation_is_preserved_without_automatic_evidence_promotion(client):
    q = scenario()
    cited_input(q)
    data = assess(client, q)
    c = candidate(data, DIMENSIONLESS_ID)
    path = f"model_inputs.{DIMENSIONLESS_ID}.eta_g"
    assert data["provenance"]["model_inputs"][DIMENSIONLESS_ID]["eta_g"]["source_refs"][0]["page"] == 8
    assert c["evidence"]["input_evidence"][path] == "documented_unreviewed"
    assert "source_not_reviewed" in codes(data, DIMENSIONLESS_ID)
    assert not data["selected_models"]


def test_documented_experiment_is_not_silently_downgraded(client):
    q = scenario()
    q["scenario_kind"] = "documented_experiment"
    data = assess(client, q)
    assert "documented_evaluation_unavailable" in codes(data, DIMENSIONLESS_ID)
    assert not data["selected_models"]


def test_scope_mismatch_after_control_change_blocks_consumed_input(client):
    q = scenario()
    q["environment"]["pressure"] = quantity(10.0, "kPa")
    q["model_inputs"][DIMENSIONLESS_ID]["eta_g"]["scope"] = {"environment.pressure": 10000.0}
    before = assess(client, q)
    assert before["selected_models"]
    q["environment"]["pressure"]["value"] = 11.0
    q["revision"] += 1
    after = assess(client, q)
    assert "source_scope_mismatch" in codes(after, DIMENSIONLESS_ID)
    assert not after["selected_models"] and before["fingerprint"] != after["fingerprint"]


@pytest.mark.parametrize("parents,extra_code", [
    (["absent.parent"], "incomplete_derivation"),
    ([f"model_inputs.{DIMENSIONLESS_ID}.eta_g"], "cyclic_derivation"),
    ([f"model_inputs.{DIMENSIONLESS_ID}.radiation_number"], None),
])
def test_derived_provenance_is_preserved_and_requires_review(client, parents, extra_code):
    q = scenario()
    record = q["model_inputs"][DIMENSIONLESS_ID]["eta_g"]
    record.update(origin="derived", derivation={"formula": "explicit derivation", "source_refs": [],
                                              "parents": parents})
    data = assess(client, q)
    assert "derivation_not_reviewed" in codes(data, DIMENSIONLESS_ID)
    if extra_code:
        assert extra_code in codes(data, DIMENSIONLESS_ID)
    assert data["provenance"]["model_inputs"][DIMENSIONLESS_ID]["eta_g"]["derivation"]["parents"] == parents
    assert not data["selected_models"]


def test_context_controls_are_normalized_but_do_not_create_physical_sensitivities(client):
    q = scenario()
    q["environment"]["oxygen"] = {**quantity(20.0, "%"), "basis": "volume"}
    q["environment"]["airflow"]["speed"] = quantity(20.0, "cm/s")
    q["environment"]["pressure"] = quantity(100.0, "kPa")
    q["fuel"]["material"] = declaration("Hypothetical material")
    q["fuel"]["geometry"] = {"shape": declaration("sheet"), "length": quantity(10.0, "cm"),
                             "width": quantity(10.0, "mm")}
    data = evaluate(client, q)
    a = data["assessment"]
    assert a["normalized_values"]["environment.oxygen"] == 0.2
    assert a["normalized_values"]["environment.airflow.speed"] == 0.2
    assert a["normalized_values"]["fuel.geometry.width"] == 0.01
    assert a["visual_capabilities"]["hypothetical_geometry_schematic"] is True
    assert a["visual_capabilities"]["physical_overlay"] is False
    c = candidate(a, DIMENSIONLESS_ID)
    assert "environment.oxygen" in c["context_only_inputs"]
    assert "environment.oxygen" in c["unsupported_controls"]
    q["environment"]["oxygen"]["value"] = 21.0
    q["revision"] += 1
    changed = evaluate(client, q)
    assert changed["results"] == data["results"]
    assert changed["assessment"]["fingerprint"] != a["fingerprint"]


def test_multiple_urban_mass_representations_require_explicit_resolution(client):
    q = scenario()
    complete_research(q, CONCURRENT_ID)
    q["model_inputs"][CONCURRENT_ID].update(
        solid_density=quantity(1.0, "kg/m3"), solid_full_thickness=quantity(2.0, "m"),
    )
    assert "conflicting_parameter_alternatives" in codes(assess(client, q), CONCURRENT_ID)


def test_unreviewed_geometry_never_enables_a_visual_capability(client):
    q = scenario()
    q["fuel"]["geometry"] = {"shape": declaration("sheet"), "length": quantity(1.0, "m"),
                             "width": quantity(1.0, "m")}
    q["fuel"]["geometry"]["length"].update(
        origin="derived", derivation={"formula": "unreviewed pixel conversion",
                                     "source_refs": [], "parents": ["unavailable.calibration"]},
    )
    data = assess(client, q)
    assert data["selected_models"]  # Geometry is not a dimensionless evaluator input.
    assert data["visual_capabilities"]["hypothetical_geometry_schematic"] is False
    assert data["visual_capabilities"]["physical_overlay"] is False


def test_unavailable_sources_and_model_review_do_not_fetch_files_or_mutate_request(client):
    q = scenario()
    record = cited_input(q)
    record["source_refs"][0]["file"] = "missing-source.pdf"
    before = copy.deepcopy(q)
    first = assess(client, q)
    assert first == assess(client, q)
    assert q == before and not first["selected_models"]
    assert assess_scenario(ScenarioRequest.model_validate(scenario())).selected_models


@pytest.mark.parametrize("eta,radiation,expected", [
    (1.0, 1.0, "zero_branch"), (2.0, 2.25, "negative_branch"), (0.0, 1.0, "no_real_branch"),
])
def test_adapter_preserves_all_legacy_mathematical_branch_outcomes(client, eta, radiation, expected):
    q = scenario()
    q["model_inputs"][DIMENSIONLESS_ID]["eta_g"]["value"] = eta
    q["model_inputs"][DIMENSIONLESS_ID]["radiation_number"]["value"] = radiation
    new = evaluate(client, q)["results"][0]
    legacy = client.post("/api/twin/evaluate", json={
        "schema_version": "1", "model_id": MODEL_ID, "mode": "dimensionless",
        "flow_configuration": "opposed", "parameter_origin": "user_assumption",
        "cases": [{"eta_g": eta, "radiation_number": radiation}],
    }).json()["data"]["results"][0]
    assert new["model_status"] == expected
    assert {k: new[k] for k in ("eta_f", "discriminant", "model_status")} == {
        k: legacy[k] for k in ("eta_f", "discriminant", "model_status")
    }


def test_evaluation_reassesses_and_rejects_stale_fingerprints(client):
    q = scenario()
    fingerprint = assess(client, q)["fingerprint"]
    q["revision"] += 1
    data = envelope(client.post(EVALUATE, json={"scenario": q, "assessment_fingerprint": fingerprint}), 409)
    assert data["assessment"]["revision"] == 2 and "results" not in data
    blocked = scenario()
    blocked["model_inputs"] = {}
    data = envelope(client.post(EVALUATE, json={"scenario": blocked,
                                              "assessment_fingerprint": assess(client, blocked)["fingerprint"]}), 422)
    assert data["assessment"]["blocked_outputs"] and "results" not in data


@pytest.mark.parametrize("value", [True, "1", float("nan"), float("inf")])
def test_invalid_numbers_are_safely_rejected_in_new_envelopes(client, value):
    q = scenario()
    q["model_inputs"][DIMENSIONLESS_ID]["eta_g"]["value"] = value
    envelope(client.post(ASSESS, content=json.dumps(q), headers={"Content-Type": "application/json"}), 422)


@pytest.mark.parametrize("mutation", ["unit", "citation", "derived", "evidence", "version", "outputs"])
def test_strict_contract_rejects_ambiguous_units_or_fabricated_evidence(client, mutation):
    q = scenario()
    if mutation == "unit":
        q["model_inputs"][DIMENSIONLESS_ID]["eta_g"]["unit"] = "m/s"
    elif mutation == "citation":
        q["model_inputs"][DIMENSIONLESS_ID]["eta_g"]["origin"] = "documented"
    elif mutation == "derived":
        q["model_inputs"][DIMENSIONLESS_ID]["eta_g"]["origin"] = "derived"
    elif mutation == "evidence":
        q["scientifically_validated"] = True
    elif mutation == "version":
        q["schema_version"] = "2"
    else:
        q["requested_outputs"] *= 2
    envelope(client.post(ASSESS, json=q), 422)


def test_oxygen_requires_explicit_basis_and_no_documented_constant_is_defaulted(client):
    q = scenario()
    q["environment"]["oxygen"] = quantity(20.0, "%")
    envelope(client.post(ASSESS, json=q), 422)
    c = candidate(assess(client, scenario()), CRITICAL_FLOW_ID)
    assert any(p.endswith("stefan_boltzmann_constant") for p in c["missing_parameters"])


def test_unknown_model_and_malformed_json_use_scenario_error_envelopes(client):
    q = scenario()
    q["model_preference"] = "unknown-model"
    envelope(client.post(ASSESS, json=q), 404)
    envelope(client.post(ASSESS, content="{", headers={"Content-Type": "application/json"}), 422)


def test_adapter_overflow_has_no_result_and_keeps_scientific_warning(client):
    q = scenario()
    q["model_inputs"][DIMENSIONLESS_ID]["eta_g"]["value"] = 1e308
    data = evaluate(client, q, 422)
    assert "results" not in data and "floating-point" in data["error"]


def test_openapi_exposes_versioned_scenario_contract_and_original_endpoints(client):
    spec = client.get("/openapi.json").json()
    assert {ASSESS, EVALUATE, "/api/twin/scenario-models", "/api/twin/models",
            "/api/twin/evaluate"} <= set(spec["paths"])
    schema = spec["components"]["schemas"]["ScenarioRequest"]
    assert set(schema["required"]) == set(scenario())
    assert schema["additionalProperties"] is False
    quantity_schema = spec["components"]["schemas"]["Quantity"]
    assert quantity_schema["additionalProperties"] is False
    assert "default" not in quantity_schema["properties"]["value"]
