// Version 1 mirror of backend/scenario_contracts.py; no scientific defaults.
export type ScenarioModelId = 'bhattacharjee2004_dimensionless' | 'bhattacharjee2016_critical_flow' | 'urban2019_concurrent_spread'
export type ScenarioUnit = 'dimensionless' | 'fraction' | '%' | 'm' | 'cm' | 'mm' | 'm/s' | 'cm/s' | 'mm/s'
  | 'Pa' | 'kPa' | 'K' | 'm/s2' | 'kg/m3' | 'kg/m2' | 'mg/cm2' | 'J/(kg*K)' | 'W/(m2*K)' | 'W/(m2*K4)'
export type SourceReference = { source_id: string; file: string; page: number | null; locator: string; version?: string | null; sha256?: string | null }
export type ScenarioProvenance = {
  state: 'provided' | 'missing' | 'conflicting'
  origin: 'user_assumption' | 'documented' | 'derived'
  source_refs: SourceReference[]
  scope: Record<string, string | number>
  derivation?: { formula: string; source_refs: SourceReference[]; parents: string[] } | null
}
export type ScenarioQuantity = ScenarioProvenance & { value: number | null; unit: ScenarioUnit; basis?: 'mole' | 'volume' | 'mass' | null }
export type ScenarioDeclaration = ScenarioProvenance & { value: string | null }
export type ScenarioAssumption = 'steady_reduced_balance' | 'thin_fuel_radiative_scaling'
  | 'negligible_radiative_feedback' | 'thermal_kinetic_radiation_approximation'
type DimensionlessInputs = Partial<Record<'eta_g' | 'radiation_number', ScenarioQuantity>>
type CriticalInputs = Partial<Record<'surface_emissivity' | 'stefan_boltzmann_constant' | 'gas_density_at_Tv'
  | 'gas_specific_heat' | 'Tv' | 'T_infinity' | 'Tf', ScenarioQuantity>>
type ConcurrentInputs = Partial<Record<'pyrolysis_length' | 'solid_areal_mass' | 'solid_density' | 'solid_full_thickness'
  | 'solid_specific_heat' | 'Tp' | 'To' | 'Tf' | 'convective_heat_transfer_coefficient', ScenarioQuantity>>
export type ScenarioRequest = {
  schema_version: '1'; scenario_id: string; revision: number
  scenario_kind: 'hypothetical' | 'documented_experiment'
  requested_outputs: string[]; model_preference: 'auto' | ScenarioModelId
  environment: {
    oxygen?: ScenarioQuantity; pressure?: ScenarioQuantity
    airflow: { speed?: ScenarioQuantity; direction?: ScenarioDeclaration; location?: ScenarioDeclaration; reference_frame?: ScenarioDeclaration }
    gravity_regime?: ScenarioDeclaration; gravity_magnitude?: ScenarioQuantity
    gas_composition?: { identity?: ScenarioDeclaration; components?: Record<string, ScenarioQuantity> }
  }
  fuel: {
    material?: ScenarioDeclaration; composition?: ScenarioDeclaration; thermal_regime?: ScenarioDeclaration; heated_sides?: ScenarioDeclaration
    geometry: { shape?: ScenarioDeclaration; length?: ScenarioQuantity; width?: ScenarioQuantity; full_thickness?: ScenarioQuantity; areal_mass?: ScenarioQuantity }
  }
  model_inputs: {
    bhattacharjee2004_dimensionless?: DimensionlessInputs
    bhattacharjee2016_critical_flow?: CriticalInputs
    urban2019_concurrent_spread?: ConcurrentInputs
  }
  assumptions: Partial<Record<ScenarioAssumption, ScenarioDeclaration>>
  evidence_context: { experiment_id?: string | null; sample_id?: string | null; sequence_id?: string | null; processing_variant?: string | null }
}
export type ModelEvidence = {
  equation: 'verified_file_page' | 'verified_html_page_unresolved'
  software: 'implemented_tested' | 'not_implemented'
  reproduction: 'not_attempted' | 'not_reproduced' | 'incomplete'
  experimental_validation: 'unvalidated'
  input_evidence: Record<string, string>
}
export type ScenarioModel = {
  model_id: ScenarioModelId; model_version: string; evaluator_id: string | null
  flow_configuration: string; gravity_regime: string | null; thermal_regime: string
  implemented: boolean; available_output: string
  source: Record<string, string | number | null>
  required_parameters: Record<string, ScenarioUnit>; parameter_alternatives: string[][]
  alternative_parameter_units: Record<string, ScenarioUnit>
  required_assumptions: ScenarioAssumption[]; evidence: ModelEvidence
}
export type ScenarioRegistry = { schema_version: '1'; registry_version: string; models: ScenarioModel[] }
export type ScenarioReason = {
  code: string; model_id: string; requested_output: string | null; field_path: string | null
  message: string; needed_evidence: string; next_action: string; blocks_evaluation: boolean
}
export type CandidateAssessment = {
  model: ScenarioModel; compatibility: 'compatible' | 'incompatible' | 'undetermined'
  readiness: 'eligible' | 'blocked'; reasons: ScenarioReason[]; missing_parameters: string[]
  used_inputs: string[]; context_only_inputs: string[]; unsupported_controls: string[]; evidence: ModelEvidence
}
export type ScenarioAssessment = {
  schema_version: '1'; registry_version: string; scenario_id: string; revision: number; fingerprint: string
  provenance: ScenarioRequest; normalized_values: Record<string, string | number | null>
  candidates: CandidateAssessment[]
  outputs: { requested_output: string; model_id: string | null; status: 'selected' | 'blocked'; reasons: ScenarioReason[] }[]
  selected_models: Record<string, string>; permitted_outputs: string[]; blocked_outputs: string[]
  visual_capabilities: {
    numerical_chart: boolean; hypothetical_geometry_schematic: boolean
    physical_overlay: false; flame_shape: false; time_evolution: false; temperature: false; heat_release: false; fire_risk: false
  }
}
export type ScenarioEvaluation = {
  assessment: ScenarioAssessment
  results: {
    requested_output: 'dimensionless_branch'; model_id: ScenarioModelId; model_version: string
    evaluator_id: string; evaluator_version: string; result_kind: 'mathematical_dimensionless'; scientifically_validated: false
    source: Record<string, string | number | null>; evidence: ModelEvidence; inputs: DimensionlessInputs
    units: Record<string, 'dimensionless'>; eta_f: number | null; discriminant: number
    model_status: 'positive_branch' | 'zero_branch' | 'negative_branch' | 'no_real_branch'
  }[]
}
export type ScenarioFailure = {
  error?: string
  errors?: { location: (string | number)[]; message: string; type: string }[]
  assessment?: ScenarioAssessment
}
