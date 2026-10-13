"""Pure scenario assessment and an adapter to existing dimensionless mathematics."""

# File-size exception: the cohesive version 1 decision pass retains the complete scientific refusal audit.
import hashlib
import json

from pydantic import BaseModel

from backend.physics import evaluate_thin_branch
from backend.scenario_contracts import (
    CandidateAssessment,
    Declaration,
    ModelDescription,
    OutputDisposition,
    Provenance,
    Reason,
    ScenarioAssessment,
    ScenarioEvaluationData,
    ScenarioRequest,
    ScenarioResult,
    VisualCapabilities,
)
from backend.scenario_registry import DIMENSIONLESS_ID, REGISTRY_VERSION, scenario_models
from backend.simulation_contracts import MODEL_ID, MODEL_VERSION

# Unit identities/conversions only; no physical properties or scientific presets.
UNIT_CONVERSIONS = {
    "cm": ("m", 0.01), "mm": ("m", 0.001),
    "cm/s": ("m/s", 0.01), "mm/s": ("m/s", 0.001),
    "kPa": ("Pa", 1000.0), "mg/cm2": ("kg/m2", 0.01), "%": ("fraction", 0.01),
}
COMMON_UNITS = {
    "environment.oxygen": "fraction", "environment.pressure": "Pa",
    "environment.airflow.speed": "m/s", "environment.gravity_magnitude": "m/s2",
    "fuel.geometry.length": "m", "fuel.geometry.width": "m",
    "fuel.geometry.full_thickness": "m", "fuel.geometry.areal_mass": "kg/m2",
}
CONTEXT_CONTROLS = [
    "environment.oxygen", "environment.airflow.speed", "environment.pressure",
    "fuel.material", "fuel.geometry",
]


class UnknownScenarioModel(ValueError):
    pass


def records(scenario: ScenarioRequest) -> dict[str, Provenance]:
    found = {}

    def visit(value, path):
        if isinstance(value, Provenance):
            found[path] = value
        elif isinstance(value, BaseModel):
            for key in type(value).model_fields:
                visit(getattr(value, key), f"{path}.{key}" if path else key)
        elif isinstance(value, dict):
            for key, item in value.items():
                visit(item, f"{path}.{key}")

    visit(scenario, "")
    return found


def normalize(scenario: ScenarioRequest, entries: dict[str, Provenance]) -> dict:  # noqa: C901
    # One audited pass keeps unit compatibility, missing values and fraction basis checks together.
    expected = dict(COMMON_UNITS)
    for model in scenario_models():
        for key, unit in (model.required_parameters | model.alternative_parameter_units).items():
            expected[f"model_inputs.{model.model_id}.{key}"] = unit
    values = {}
    for path, record in entries.items():
        if isinstance(record, Declaration):
            values[path] = record.value
            continue
        unit, factor = UNIT_CONVERSIONS.get(record.unit, (record.unit, 1.0))
        target = "fraction" if path.startswith("environment.gas_composition.components.") else expected[path]
        if unit != target:
            raise ValueError(f"{path} requires {target}; received {record.unit}.")
        if record.value is None:
            values[path] = None
            continue
        number = record.value * factor
        # Input is finite, but multiplication during unit normalization can overflow.
        if not (-float("inf") < number < float("inf")):
            raise ValueError(f"{path} exceeds the finite unit-conversion range.")
        if path == "environment.oxygen" or path.startswith("environment.gas_composition.components."):
            if record.basis is None:
                raise ValueError(f"{path} requires an explicit fraction basis.")
            if not 0 <= number <= 1:
                raise ValueError(f"{path} must be a fraction between zero and one.")
        if path in COMMON_UNITS and path != "environment.oxygen":
            allow_zero = path in {"environment.airflow.speed", "environment.gravity_magnitude"}
            if number < 0 or (number == 0 and not allow_zero):
                raise ValueError(f"{path} must be {'nonnegative' if allow_zero else 'positive'}.")
        values[path] = number
    return values


def reason(model_id, code, path, message, needed, action, *, blocks=True, output=None) -> Reason:  # noqa: PLR0913
    # Arguments mirror the structured refusal contract, retaining explicit evidence and next-action fields.
    return Reason(
        code=code, model_id=model_id, requested_output=output, field_path=path,
        message=message, needed_evidence=needed, next_action=action, blocks_evaluation=blocks,
    )


def provenance_reasons(model_id, path, record, entries, values, *, consumed) -> list[Reason]:  # noqa: C901, PLR0913
    # Record and complete scenario context are explicit to audit scope and parent chains without hidden state.
    reasons = []
    if record.state == "conflicting":
        reasons.append(reason(
            model_id, "conflicting_sources", path, f"The supplied sources disagree on {path}.",
            "One resolved value with its source and applicable scope.",
            "Resolve the conflict without fitting to a published result.", blocks=consumed,
        ))
    if record.state != "provided":
        return reasons
    for condition, expected in record.scope.items():
        actual = values.get(condition)
        if actual is None or actual != expected:
            reasons.append(reason(
                model_id, "source_scope_mismatch", path,
                f"This value's scope does not match the current condition {condition}.",
                "A value supported for the current conditions in canonical units.",
                "Update the value and its provenance for the edited scenario.", blocks=consumed,
            ))
    if record.origin == "documented":
        reasons.append(reason(
            model_id, "source_not_reviewed", path,
            "The citation is retained but this parameter has no reviewed backend evidence record.",
            "A reviewed parameter/source/scope record; a submitted citation is insufficient.",
            "Keep the documented scenario blocked or explicitly create a hypothetical alternative.",
            blocks=consumed,
        ))
    elif record.origin == "derived":
        parents = record.derivation.parents
        if any(p not in entries or entries[p].state != "provided" for p in parents):
            reasons.append(reason(
                model_id, "incomplete_derivation", path, "The derivation has missing or unusable parent inputs.",
                "Complete parent provenance and a reviewed derivation.", "Supply the missing parent records.",
                blocks=consumed,
            ))
        visiting = set()

        def cyclic(node):
            if node in visiting:
                return True
            parent = entries.get(node)
            if parent is None or parent.derivation is None:
                return False
            visiting.add(node)
            result = any(cyclic(p) for p in parent.derivation.parents)
            visiting.remove(node)
            return result

        if cyclic(path):
            reasons.append(reason(
                model_id, "cyclic_derivation", path, "The provenance chain contains a cycle.",
                "An acyclic derivation with source-backed parents.", "Remove the circular dependency.",
                blocks=consumed,
            ))
        reasons.append(reason(
            model_id, "derivation_not_reviewed", path,
            "The supplied derivation is preserved but no reviewed conversion adapter is implemented.",
            "A reviewed derivation and implementation; no formula is evaluated from request text.",
            "Supply an explicit hypothetical input or implement a reviewed conversion in a later increment.",
            blocks=consumed,
        ))
    return reasons


def assess_candidate(model: ModelDescription, scenario, entries, values) -> CandidateAssessment:  # noqa: C901, PLR0915
    # This decision pass aggregates every blocker; it intentionally does not stop at the first failed requirement.
    mid = model.model_id
    reasons = []
    compatibility = "compatible"
    used = []
    missing = []
    requirements = {
        "environment.airflow.direction": model.flow_configuration,
        "fuel.thermal_regime": model.thermal_regime,
        "environment.gravity_regime": model.gravity_regime,
    }
    requirements.update({f"assumptions.{key}": "acknowledged" for key in model.required_assumptions})
    for path, expected in requirements.items():
        used.append(path)
        value = values.get(path)
        if value is None or value == "unknown":
            if compatibility != "incompatible":
                compatibility = "undetermined"
            reasons.append(reason(
                mid, "missing_context", path, f"Insufficient evidence: {path} has not been established.",
                "A supported declaration or an explicit hypothetical assumption.",
                "Declare this context without inferring it from images or material thickness.",
            ))
        elif expected is not None and value != expected:
            compatibility = "incompatible"
            reasons.append(reason(
                mid, "incompatible_scenario", path, f"This model requires {expected}; the scenario declares {value}.",
                "A scenario within the model's stated scope.", "Choose an applicable model or edit the scenario.",
            ))
    prefix = f"model_inputs.{mid}."
    units = model.required_parameters | model.alternative_parameter_units
    required = list(model.required_parameters)
    if model.parameter_alternatives:
        complete = [group for group in model.parameter_alternatives
                    if all(values.get(prefix + key) is not None for key in group)]
        provided_groups = [group for group in model.parameter_alternatives
                           if any(values.get(prefix + key) is not None for key in group)]
        if len(provided_groups) > 1:
            reasons.append(reason(
                mid, "conflicting_parameter_alternatives", prefix,
                "Multiple areal-mass representations were supplied; no convention is chosen automatically.",
                "Exactly one unambiguous areal-mass representation.",
                "Supply solid_areal_mass or the density/full-thickness pair, not both.",
            ))
        if len(complete) == 1:
            required.extend(complete[0])
        elif not complete:
            group_path = " | ".join(" + ".join(prefix + key for key in group)
                                    for group in model.parameter_alternatives)
            missing.append(group_path)
            reasons.append(reason(
                mid, "missing_parameter_alternative", group_path,
                "Insufficient evidence: provide areal mass or the complete density/full-thickness pair.",
                "One complete input alternative with units and provenance.", "Supply one complete alternative.",
            ))
    for key in required:
        path = prefix + key
        used.append(path)
        if values.get(path) is None:
            missing.append(path)
            reasons.append(reason(
                mid, "missing_parameter", path, f"Insufficient evidence: {key} is required in {units[key]}.",
                f"An explicit value in {units[key]} with provenance.", "Provide the missing value; no default is used.",
            ))
        elif values[path] < 0 or (mid != DIMENSIONLESS_ID and values[path] == 0
                                  and key != "surface_emissivity"):
            reasons.append(reason(
                mid, "invalid_parameter", path, "The input is outside the equation's mathematical domain.",
                "A mathematically admissible explicit input.", "Correct the input without fitting a reference.",
            ))
    if mid != DIMENSIONLESS_ID:
        temp_keys = ("Tf", "Tv", "T_infinity") if model.flow_configuration == "opposed" else ("Tf", "Tp", "To")
        temps = [values.get(prefix + key) for key in temp_keys]
        if all(t is not None for t in temps) and not temps[0] > temps[1] > temps[2]:
            reasons.append(reason(
                mid, "invalid_temperature_order", prefix,
                "The source temperature ordering for a positive model estimate is not satisfied.",
                "Source-consistent temperature conventions.", "Review the temperatures and their definitions.",
            ))
        emissivity = values.get(prefix + "surface_emissivity")
        if emissivity is not None and emissivity > 1:
            reasons.append(reason(
                mid, "invalid_parameter", prefix + "surface_emissivity", "Emissivity exceeds its fractional domain.",
                "An emissivity in the definitional interval [0, 1].", "Check units and input provenance.",
            ))
    for path, record in entries.items():
        if path.startswith("model_inputs.") and not path.startswith(prefix):
            continue
        reasons.extend(provenance_reasons(mid, path, record, entries, values, consumed=path in used))
    if scenario.scenario_kind != "hypothetical":
        reasons.append(reason(
            mid, "documented_evaluation_unavailable", "scenario_kind",
            "No reviewed experimental input set is implemented; this scenario cannot yield a documented result.",
            "Reviewed case-specific parameters and their complete provenance.",
            "Keep the experiment blocked or explicitly create a separate hypothetical scenario.",
        ))
    if not model.implemented:
        reasons.append(reason(
            mid, "model_not_implemented", None, "The equation has been investigated, but no evaluator is available.",
            "An implemented and software-verified evaluator.",
            "Retain this research model as blocked until a later authorized increment.",
        ))
        reasons.append(reason(
            mid, "reproduction_not_established", None,
            "No complete traceable reproduction has been established; future estimates remain unvalidated.",
            "Independent calculation, input citations and error against a compatible published case.",
            "Complete the source/parameter audit; do not fit values to the target.", blocks=False,
        ))
    if model.evidence.equation == "verified_html_page_unresolved":
        reasons.append(reason(
            mid, "source_page_unverified", None, "The equation's printed source page remains unverified.",
            "The original equation file and verified printed page.", "Verify the original PDF before exposure.",
        ))
    evidence = model.evidence.model_copy(deep=True)
    evidence.input_evidence = {
        path: (entries[path].origin + ("_unreviewed" if entries[path].origin != "user_assumption" else "")
               if entries[path].state == "provided" else entries[path].state)
        for path in used if path in entries
    }
    context = [p for p in entries if p not in used and not p.startswith("model_inputs.")]
    return CandidateAssessment(
        model=model, compatibility=compatibility,
        readiness="blocked" if any(r.blocks_evaluation for r in reasons) else "eligible",
        reasons=reasons, missing_parameters=missing, used_inputs=used,
        context_only_inputs=context, unsupported_controls=list(CONTEXT_CONTROLS), evidence=evidence,
    )


def assess_scenario(scenario: ScenarioRequest) -> ScenarioAssessment:
    models = scenario_models()
    if scenario.model_preference != "auto" and scenario.model_preference not in {m.model_id for m in models}:
        raise UnknownScenarioModel("Unknown scenario model_id.")
    entries = records(scenario)
    values = normalize(scenario, entries)
    candidates = [assess_candidate(m, scenario, entries, values) for m in models]
    outputs = []
    selected = {}
    for output in scenario.requested_outputs:
        considered = [c for c in candidates if scenario.model_preference in {"auto", c.model.model_id}]
        eligible = [c for c in considered if c.readiness == "eligible" and c.model.available_output == output]
        if len(eligible) == 1:
            mid = eligible[0].model.model_id
            selected[output] = mid
            outputs.append(OutputDisposition(requested_output=output, model_id=mid, status="selected", reasons=[]))
            continue
        reasons = []
        for candidate in considered:
            reasons.extend(r.model_copy(update={"requested_output": output}) for r in candidate.reasons)
            if candidate.model.available_output != output:
                reasons.append(reason(
                    candidate.model.model_id, "output_not_supported", None,
                    f"This model cannot produce {output}; it describes {candidate.model.available_output}.",
                    "An available model that produces the exact requested output.",
                    "Choose a supported output explicitly; no fallback is performed.", output=output,
                ))
        if len(eligible) > 1:
            reasons.append(reason(
                "auto", "model_choice_required", "model_preference",
                "Multiple eligible models exist; an explicit model choice is required.",
                "An explicit model preference.", "Select one eligible model.", output=output,
            ))
        outputs.append(OutputDisposition(requested_output=output, model_id=None, status="blocked", reasons=reasons))
    snapshot = {"scenario": scenario.model_dump(mode="json"), "normalized_values": values,
                "registry_version": REGISTRY_VERSION, "models": [m.model_dump(mode="json") for m in models]}
    digest = hashlib.sha256(json.dumps(snapshot, sort_keys=True, separators=(",", ":"),
                                       allow_nan=False).encode()).hexdigest()
    geometry_paths = ("fuel.geometry.shape", "fuel.geometry.length", "fuel.geometry.width")
    schematic = scenario.scenario_kind == "hypothetical" and all(
        p in entries and entries[p].state == "provided" and entries[p].origin == "user_assumption"
        and values.get(p) not in (None, "unknown")
        and not provenance_reasons("visual", p, entries[p], entries, values, consumed=True)
        for p in geometry_paths
    )
    return ScenarioAssessment(
        schema_version="1", registry_version=REGISTRY_VERSION, scenario_id=scenario.scenario_id,
        revision=scenario.revision, fingerprint=digest, provenance=scenario, normalized_values=values,
        candidates=candidates, outputs=outputs, selected_models=selected,
        permitted_outputs=list(selected), blocked_outputs=[o.requested_output for o in outputs if o.status == "blocked"],
        visual_capabilities=VisualCapabilities(
            numerical_chart=bool(selected), hypothetical_geometry_schematic=schematic,
            physical_overlay=False, flame_shape=False, time_evolution=False,
            temperature=False, heat_release=False, fire_risk=False,
        ),
    )


def evaluate_scenario(assessment: ScenarioAssessment) -> ScenarioEvaluationData:
    """Adapt only an eligible dimensionless scenario; no new physical equation."""
    if assessment.blocked_outputs or assessment.selected_models != {"dimensionless_branch": DIMENSIONLESS_ID}:
        raise ValueError("Scenario evaluation is blocked; no partial results or fallback are returned.")
    scenario = assessment.provenance
    prefix = f"model_inputs.{DIMENSIONLESS_ID}."
    branch = evaluate_thin_branch(
        assessment.normalized_values[prefix + "eta_g"], assessment.normalized_values[prefix + "radiation_number"],
    )
    candidate = next(c for c in assessment.candidates if c.model.model_id == DIMENSIONLESS_ID)
    return ScenarioEvaluationData(
        assessment=assessment,
        results=[ScenarioResult(
            requested_output="dimensionless_branch", model_id=DIMENSIONLESS_ID,
            model_version=candidate.model.model_version, evaluator_id=MODEL_ID, evaluator_version=MODEL_VERSION,
            result_kind="mathematical_dimensionless", scientifically_validated=False,
            source=candidate.model.source, evidence=candidate.evidence,
            inputs=scenario.model_inputs.bhattacharjee2004_dimensionless,
            units={k: "dimensionless" for k in ("eta_g", "radiation_number", "eta_f", "discriminant")},
            eta_f=branch.eta_f, discriminant=branch.discriminant, model_status=branch.model_status,
        )],
    )
