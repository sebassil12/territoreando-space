"""Version 1 scenario contracts; missing values never receive scientific defaults."""

# File-size exception: input and response types share one versioned public contract for API consumers.
from typing import Annotated, Literal

from pydantic import Field, FiniteFloat, field_validator, model_validator

from backend.simulation_contracts import StrictContract

Origin = Literal["user_assumption", "documented", "derived"]
State = Literal["provided", "missing", "conflicting"]
Unit = Literal[
    "dimensionless", "fraction", "%", "m", "cm", "mm", "m/s", "cm/s", "mm/s",
    "Pa", "kPa", "K", "m/s2", "kg/m3", "kg/m2", "mg/cm2", "J/(kg*K)", "W/(m2*K)",
    "W/(m2*K4)",
]
Text = Annotated[str, Field(min_length=1, max_length=256)]


class SourceReference(StrictContract):
    source_id: Text
    file: Text
    page: Annotated[int, Field(gt=0)] | None
    locator: Text
    version: Text | None = None
    sha256: Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")] | None = None


class Derivation(StrictContract):
    formula: Text
    source_refs: list[SourceReference]
    parents: Annotated[list[Text], Field(min_length=1)]


class Provenance(StrictContract):
    state: State
    origin: Origin
    source_refs: list[SourceReference]
    # Conditions use canonical units and scenario field paths, never inferred ranges.
    scope: dict[str, str | FiniteFloat]
    derivation: Derivation | None = None

    @field_validator("scope", mode="before")
    @classmethod
    def strict_scope(cls, value):
        if isinstance(value, dict) and any(isinstance(v, bool) for v in value.values()):
            raise ValueError("Scope conditions cannot be booleans.")
        return value

    @model_validator(mode="after")
    def origin_structure(self):
        if self.origin == "documented" and self.state == "provided" and not self.source_refs:
            raise ValueError("Documented values require a source reference.")
        if self.origin == "derived" and self.state == "provided" and self.derivation is None:
            raise ValueError("Derived values require a derivation and parent references.")
        if self.origin != "derived" and self.derivation is not None:
            raise ValueError("Only derived values may carry a derivation.")
        return self


class Quantity(Provenance):
    value: FiniteFloat | None
    unit: Unit
    basis: Literal["mole", "volume", "mass"] | None = None

    @field_validator("value", mode="before")
    @classmethod
    def strict_number(cls, value):
        if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float))):
            raise ValueError("A quantity must be a finite JSON number or null.")
        return value

    @model_validator(mode="after")
    def state_value(self):
        if (self.state == "provided") != (self.value is not None):
            raise ValueError("Only provided quantities may have a numeric value.")
        return self


class Declaration(Provenance):
    value: Text | None

    @model_validator(mode="after")
    def state_value(self):
        if (self.state == "provided") != (self.value is not None):
            raise ValueError("Only provided declarations may have a value.")
        return self


class Airflow(StrictContract):
    speed: Quantity | None = None
    direction: Declaration | None = None
    location: Declaration | None = None
    reference_frame: Declaration | None = None

    @field_validator("direction")
    @classmethod
    def direction_value(cls, value):
        if value and value.value not in {None, "opposed", "concurrent", "unknown"}:
            raise ValueError("Direction must be opposed, concurrent or unknown.")
        return value


class GasComposition(StrictContract):
    identity: Declaration | None = None
    components: dict[str, Quantity] = Field(default_factory=dict)


class Environment(StrictContract):
    oxygen: Quantity | None = None
    pressure: Quantity | None = None
    airflow: Airflow
    gravity_regime: Declaration | None = None
    gravity_magnitude: Quantity | None = None
    gas_composition: GasComposition | None = None

    @field_validator("gravity_regime")
    @classmethod
    def gravity_value(cls, value):
        if value and value.value not in {None, "microgravity", "normal_gravity", "other", "unknown"}:
            raise ValueError("Unknown gravity regime.")
        return value


class Geometry(StrictContract):
    shape: Declaration | None = None
    length: Quantity | None = None
    width: Quantity | None = None
    full_thickness: Quantity | None = None
    areal_mass: Quantity | None = None


class Fuel(StrictContract):
    material: Declaration | None = None
    composition: Declaration | None = None
    geometry: Geometry
    thermal_regime: Declaration | None = None
    heated_sides: Declaration | None = None

    @field_validator("thermal_regime")
    @classmethod
    def thermal_value(cls, value):
        if value and value.value not in {None, "thermally_thin", "thermally_thick", "unknown"}:
            raise ValueError("Unknown thermal regime.")
        return value


class DimensionlessInputs(StrictContract):
    eta_g: Quantity | None = None
    radiation_number: Quantity | None = None


class CriticalFlowInputs(StrictContract):
    surface_emissivity: Quantity | None = None
    stefan_boltzmann_constant: Quantity | None = None
    gas_density_at_Tv: Quantity | None = None
    gas_specific_heat: Quantity | None = None
    Tv: Quantity | None = None
    T_infinity: Quantity | None = None
    Tf: Quantity | None = None


class ConcurrentSpreadInputs(StrictContract):
    pyrolysis_length: Quantity | None = None
    solid_areal_mass: Quantity | None = None
    solid_density: Quantity | None = None
    solid_full_thickness: Quantity | None = None
    solid_specific_heat: Quantity | None = None
    Tp: Quantity | None = None
    To: Quantity | None = None
    Tf: Quantity | None = None
    convective_heat_transfer_coefficient: Quantity | None = None


class ModelInputs(StrictContract):
    bhattacharjee2004_dimensionless: DimensionlessInputs | None = None
    bhattacharjee2016_critical_flow: CriticalFlowInputs | None = None
    urban2019_concurrent_spread: ConcurrentSpreadInputs | None = None


class ScenarioAssumptions(StrictContract):
    steady_reduced_balance: Declaration | None = None
    thin_fuel_radiative_scaling: Declaration | None = None
    negligible_radiative_feedback: Declaration | None = None
    thermal_kinetic_radiation_approximation: Declaration | None = None

    @field_validator("*")
    @classmethod
    def acknowledgment(cls, value):
        if value and value.value not in {None, "acknowledged", "rejected", "unknown"}:
            raise ValueError("Assumptions require acknowledged, rejected or unknown.")
        return value


class EvidenceContext(StrictContract):
    experiment_id: Text | None = None
    sample_id: Text | None = None
    sequence_id: Text | None = None
    processing_variant: Text | None = None


class ScenarioRequest(StrictContract):
    schema_version: Literal["1"]
    scenario_id: Text
    revision: Annotated[int, Field(ge=0)]
    scenario_kind: Literal["hypothetical", "documented_experiment"]
    requested_outputs: Annotated[list[Text], Field(min_length=1, max_length=16)]
    model_preference: Text
    environment: Environment
    fuel: Fuel
    model_inputs: ModelInputs
    assumptions: ScenarioAssumptions
    evidence_context: EvidenceContext

    @field_validator("requested_outputs")
    @classmethod
    def unique_outputs(cls, value):
        if len(set(value)) != len(value):
            raise ValueError("Requested outputs must be unique.")
        return value


class ScenarioEvaluationRequest(StrictContract):
    scenario: ScenarioRequest
    assessment_fingerprint: Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")]


class Reason(StrictContract):
    code: str
    model_id: str
    requested_output: str | None
    field_path: str | None
    message: str
    needed_evidence: str
    next_action: str
    blocks_evaluation: bool


class ModelEvidence(StrictContract):
    equation: Literal["verified_file_page", "verified_html_page_unresolved"]
    software: Literal["implemented_tested", "not_implemented"]
    reproduction: Literal["not_attempted", "not_reproduced", "incomplete"]
    experimental_validation: Literal["unvalidated"]
    input_evidence: dict[str, str] = Field(default_factory=dict)


class ModelDescription(StrictContract):
    model_id: str
    model_version: str
    evaluator_id: str | None
    flow_configuration: str
    gravity_regime: str | None
    thermal_regime: str
    implemented: bool
    available_output: str
    source: dict[str, str | int | None]
    required_parameters: dict[str, str]
    parameter_alternatives: list[list[str]]
    alternative_parameter_units: dict[str, str] = Field(default_factory=dict)
    required_assumptions: list[str]
    evidence: ModelEvidence


class CandidateAssessment(StrictContract):
    model: ModelDescription
    compatibility: Literal["compatible", "incompatible", "undetermined"]
    readiness: Literal["eligible", "blocked"]
    reasons: list[Reason]
    missing_parameters: list[str]
    used_inputs: list[str]
    context_only_inputs: list[str]
    unsupported_controls: list[str]
    evidence: ModelEvidence


class OutputDisposition(StrictContract):
    requested_output: str
    model_id: str | None
    status: Literal["selected", "blocked"]
    reasons: list[Reason]


class VisualCapabilities(StrictContract):
    numerical_chart: bool
    hypothetical_geometry_schematic: bool
    physical_overlay: Literal[False]
    flame_shape: Literal[False]
    time_evolution: Literal[False]
    temperature: Literal[False]
    heat_release: Literal[False]
    fire_risk: Literal[False]


class ScenarioAssessment(StrictContract):
    schema_version: Literal["1"]
    registry_version: str
    scenario_id: str
    revision: int
    fingerprint: str
    provenance: ScenarioRequest
    normalized_values: dict[str, str | FiniteFloat | None]
    candidates: list[CandidateAssessment]
    outputs: list[OutputDisposition]
    selected_models: dict[str, str]
    permitted_outputs: list[str]
    blocked_outputs: list[str]
    visual_capabilities: VisualCapabilities


class ScenarioAssessmentEnvelope(StrictContract):
    data: ScenarioAssessment
    source: str
    warnings: list[str]
    quality: Literal["unavailable"]


class ScenarioModelsData(StrictContract):
    schema_version: Literal["1"]
    registry_version: str
    models: list[ModelDescription]


class ScenarioModelsEnvelope(StrictContract):
    data: ScenarioModelsData
    source: str
    warnings: list[str]
    quality: Literal["unavailable"]


class ScenarioResult(StrictContract):
    requested_output: Literal["dimensionless_branch"]
    model_id: str
    model_version: str
    evaluator_id: str
    evaluator_version: str
    result_kind: Literal["mathematical_dimensionless"]
    scientifically_validated: Literal[False]
    source: dict[str, str | int | None]
    evidence: ModelEvidence
    inputs: DimensionlessInputs
    units: dict[str, Literal["dimensionless"]]
    eta_f: FiniteFloat | None
    discriminant: FiniteFloat
    model_status: Literal["positive_branch", "zero_branch", "negative_branch", "no_real_branch"]


class ScenarioEvaluationData(StrictContract):
    assessment: ScenarioAssessment
    results: list[ScenarioResult]


class ScenarioEvaluationEnvelope(StrictContract):
    data: ScenarioEvaluationData
    source: str
    warnings: list[str]
    quality: Literal["modelled_unvalidated"]
