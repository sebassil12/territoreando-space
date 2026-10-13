"""Reviewed equation metadata, without material constants or scientific presets."""

from backend.scenario_contracts import ModelDescription, ModelEvidence
from backend.simulation_contracts import MODEL_ID, MODEL_VERSION, twin_model

REGISTRY_VERSION = "1"
DIMENSIONLESS_ID = "bhattacharjee2004_dimensionless"
CRITICAL_FLOW_ID = "bhattacharjee2016_critical_flow"
CONCURRENT_ID = "urban2019_concurrent_spread"
SCENARIO_SOURCE = (
    "Scenario registry v1: 20040053557.pdf Eq. (5) p.202; "
    "TM-20210011385.pdf Eq. (2.5) p.28; Urban 2019 Eq. (2), HTML, printed page unresolved."
)
SCENARIO_WARNINGS = (
    "Scenario assessment is not experimental validation or a reproduced SAFFIRE result.",
    "No missing values, material properties, scientific presets or physical sensitivities are inferred.",
    "User citations and derivations are retained but are not automatically reviewed evidence.",
    "Steady 0D models do not provide physical flame overlays, shape, time evolution or fire risk.",
)


def scenario_models() -> list[ModelDescription]:
    """Return fresh metadata so callers cannot mutate the registry."""
    thin = twin_model()
    return [
        ModelDescription(
            model_id=DIMENSIONLESS_ID, model_version=MODEL_VERSION, evaluator_id=MODEL_ID,
            flow_configuration="opposed", gravity_regime="microgravity", thermal_regime="thermally_thin",
            implemented=True, available_output="dimensionless_branch",
            source=thin.source.model_dump(),
            required_parameters={"eta_g": "dimensionless", "radiation_number": "dimensionless"},
            parameter_alternatives=[], required_assumptions=["steady_reduced_balance"],
            evidence=ModelEvidence(equation="verified_file_page", software="implemented_tested",
                                   reproduction="not_attempted", experimental_validation="unvalidated"),
        ),
        ModelDescription(
            model_id=CRITICAL_FLOW_ID, model_version="research-1", evaluator_id=None,
            flow_configuration="opposed", gravity_regime="microgravity", thermal_regime="thermally_thin",
            implemented=False, available_output="critical_flow_speed",
            source={"file": "TM-20210011385.pdf", "page": 28, "definition_page": 27,
                    "equation": "(2.5)", "url":
                    "https://ntrs.nasa.gov/api/citations/20210011385/downloads/TM-20210011385.pdf"},
            required_parameters={
                "surface_emissivity": "dimensionless", "stefan_boltzmann_constant": "W/(m2*K4)",
                "gas_density_at_Tv": "kg/m3", "gas_specific_heat": "J/(kg*K)",
                "Tv": "K", "T_infinity": "K", "Tf": "K",
            },
            parameter_alternatives=[],
            required_assumptions=["steady_reduced_balance", "thin_fuel_radiative_scaling",
                                  "negligible_radiative_feedback"],
            evidence=ModelEvidence(equation="verified_file_page", software="not_implemented",
                                   reproduction="not_reproduced", experimental_validation="unvalidated"),
        ),
        ModelDescription(
            model_id=CONCURRENT_ID, model_version="research-1", evaluator_id=None,
            flow_configuration="concurrent", gravity_regime=None, thermal_regime="thermally_thin",
            implemented=False, available_output="concurrent_spread_speed",
            source={"file": "urban2019.pdf", "page": None, "equation": "(2)",
                    "locator": "Publisher HTML, Section 1.1",
                    "url": "https://www.sciencedirect.com/science/article/pii/S0010218018304395"},
            required_parameters={
                "pyrolysis_length": "m", "solid_specific_heat": "J/(kg*K)",
                "Tp": "K", "To": "K", "Tf": "K", "convective_heat_transfer_coefficient": "W/(m2*K)",
            },
            parameter_alternatives=[["solid_areal_mass"], ["solid_density", "solid_full_thickness"]],
            alternative_parameter_units={
                "solid_areal_mass": "kg/m2", "solid_density": "kg/m3", "solid_full_thickness": "m",
            },
            required_assumptions=["steady_reduced_balance", "thermal_kinetic_radiation_approximation"],
            evidence=ModelEvidence(equation="verified_html_page_unresolved", software="not_implemented",
                                   reproduction="incomplete", experimental_validation="unvalidated"),
        ),
    ]
