"""Versioned contracts and source metadata for the dimensionless model API."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat

MODEL_ID = "bhattacharjee2003_thin_radiative_v1"
MODEL_VERSION = "1"
MAX_CASES_PER_REQUEST = 1000  # Operational response-size limit, not a scientific range.
SOURCE = "20040053557.pdf, Eq. (5), p.202; definitions Eq. (2), p.201 (NASA NTRS 20040053557)"
WARNINGS = (
    "Approximate dimensionless steady thin-fuel branch; user assumptions, not validated SAFFIRE results.",
    "Branch sign and discriminant are mathematical diagnostics, not physical extinction or fire-risk diagnoses.",
    "The source extinction inequality on p.202 conflicts with Fig. 4 on p.203; no extinction criterion is applied.",
    "No dimensional speed, temperatures, material properties, sequence mapping, or empirical validity range.",
)


class StrictContract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class TwinCase(StrictContract):
    eta_g: Annotated[FiniteFloat, Field(ge=0, description="Vg / Vf,th,thin; dimensionless, user supplied.")]
    radiation_number: Annotated[
        FiniteFloat, Field(ge=0, description="R0 from source Eq. (2); dimensionless, user supplied.")
    ]


class TwinEvaluationRequest(StrictContract):
    schema_version: Literal["1"]
    model_id: str
    flow_configuration: Literal["opposed"]
    mode: Literal["dimensionless"]
    parameter_origin: Literal["user_assumption"]
    cases: Annotated[list[TwinCase], Field(min_length=1, max_length=MAX_CASES_PER_REQUEST)]


class TwinCaseResult(TwinCase):
    eta_f: FiniteFloat | None
    discriminant: FiniteFloat
    model_status: Literal["positive_branch", "zero_branch", "negative_branch", "no_real_branch"]


class ModelSource(StrictContract):
    file: str
    page: int
    definition_page: int
    equation: str
    url: str


class TwinModel(StrictContract):
    model_id: str
    model_version: str
    schema_version: Literal["1"]
    mode: Literal["dimensionless"]
    flow_configuration: Literal["opposed"]
    parameter_origin: Literal["user_assumption"]
    equation: str
    definitions: dict[str, str]
    input_domain: str
    max_cases_per_request: int
    equation_verified_against_source: bool
    scientifically_validated: bool
    source: ModelSource
    assumptions: list[str]


def twin_model() -> TwinModel:
    """Describe the implemented equation; availability does not require local raw assets."""
    return TwinModel(
        model_id=MODEL_ID, model_version=MODEL_VERSION, schema_version="1",
        mode="dimensionless", flow_configuration="opposed", parameter_origin="user_assumption",
        equation="eta_f ~ (1 - eta_g + sqrt((1 + eta_g)^2 - 4 * radiation_number)) / 2",
        definitions={
            "eta_g": "Vg / Vf,th,thin: opposing gas-flow speed divided by the thin-fuel thermal-limit speed.",
            "eta_f": "Vf / Vf,th,thin: spread-speed ratio; this API returns the mathematical plus-root branch.",
            "radiation_number": "R0: dimensionless surface-radiation parameter defined in Eq. (2), p.201.",
        },
        input_domain="Finite non-negative inputs; mathematical domain only, no empirically validated range.",
        max_cases_per_request=MAX_CASES_PER_REQUEST,
        equation_verified_against_source=True, scientifically_validated=False,
        source=ModelSource(
            file="20040053557.pdf", page=202, definition_page=201, equation="(5), thin limit",
            url="https://ntrs.nasa.gov/api/citations/20040053557/downloads/20040053557.pdf",
        ),
        assumptions=[
            "Steady reduced energy balance for a thermally thin fuel (heated layer equals fuel thickness).",
            "Microgravity with opposing flow; only the non-negative eta_g subset is exposed.",
            "Radiation_number is supplied independently; gas and solid properties are not inferred.",
            "Evaluation of an approximate published expression is not experimental validation.",
        ],
    )


class TwinEvaluationData(StrictContract):
    schema_version: Literal["1"]
    model_id: str
    model_version: str
    mode: Literal["dimensionless"]
    flow_configuration: Literal["opposed"]
    parameter_origin: Literal["user_assumption"]
    scientifically_validated: Literal[False]
    units: dict[str, Literal["dimensionless"]]
    results: list[TwinCaseResult]


class TwinEnvelope(StrictContract):
    source: str
    warnings: list[str]
    quality: Literal["modelled_unvalidated"]


class TwinEvaluationEnvelope(TwinEnvelope):
    data: TwinEvaluationData


class TwinModelsEnvelope(TwinEnvelope):
    data: list[TwinModel]
