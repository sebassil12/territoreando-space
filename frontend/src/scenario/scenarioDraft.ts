import type { CandidateAssessment, ScenarioAssessment, ScenarioAssumption, ScenarioDeclaration, ScenarioModel, ScenarioModelId, ScenarioQuantity, ScenarioRegistry, ScenarioRequest, ScenarioUnit } from '../api'

export const DIMENSIONLESS_MODEL: ScenarioModelId = 'bhattacharjee2004_dimensionless'
export const MODEL_IDS: ScenarioModelId[] = [DIMENSIONLESS_MODEL, 'bhattacharjee2016_critical_flow', 'urban2019_concurrent_spread']
export type ScenarioDraft = {
  id: string; revision: number; kind: ScenarioRequest['scenario_kind']
  output: string; preference: ScenarioRequest['model_preference']
  values: Record<string, string>; acknowledgments: Partial<Record<ScenarioAssumption, boolean>>
}
export function blankDraft(id: string): ScenarioDraft {
  return { id, revision: 0, kind: 'hypothetical', output: 'dimensionless_branch', preference: 'auto', values: {}, acknowledgments: {} }
}
export const assumption = (value: string): ScenarioDeclaration => ({
  state: 'provided', value, origin: 'user_assumption', source_refs: [], scope: {},
})
export function numericInput(raw: string | undefined, unit: ScenarioUnit): ScenarioQuantity | undefined {
  if (!raw?.trim()) return undefined
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim()) || !Number.isFinite(Number(raw))) {
    throw new Error('Enter a finite number or leave the parameter empty.')
  }
  return { ...assumption(raw), value: Number(raw), unit }
}
function namedInput(draft: ScenarioDraft, name: string, unit: ScenarioUnit) {
  return numericInput(draft.values[name], unit)
}
function declared(draft: ScenarioDraft, name: string) {
  return draft.values[name]?.trim() ? assumption(draft.values[name].trim()) : undefined
}
function modelInputs(draft: ScenarioDraft, models: ScenarioModel[]): ScenarioRequest['model_inputs'] {
  return Object.fromEntries(models.map((model) => [
    model.model_id,
    Object.fromEntries(Object.entries(activeParameters(draft, model))
      .map(([key, unit]) => [key, namedInput(draft, `model_inputs.${model.model_id}.${key}`, unit)])
      .filter(([, value]) => value !== undefined)),
  ]))
}
export function buildScenario(draft: ScenarioDraft, registry: ScenarioRegistry): ScenarioRequest {
  if (registry.schema_version !== '1' || registry.models.some((m) => !MODEL_IDS.includes(m.model_id))) {
    throw new Error('Unsupported scenario registry contract.')
  }
  return {
    schema_version: '1', scenario_id: draft.id, revision: draft.revision, scenario_kind: draft.kind,
    requested_outputs: [draft.output], model_preference: draft.preference,
    environment: {
      airflow: {
        direction: declared(draft, 'airflow.direction'), speed: namedInput(draft, 'airflow.speed', 'm/s'),
        location: declared(draft, 'airflow.location'), reference_frame: declared(draft, 'airflow.reference_frame'),
      },
      gravity_regime: declared(draft, 'gravity_regime'),
      pressure: namedInput(draft, 'pressure', 'Pa'),
      oxygen: draft.values.oxygen?.trim() ? { ...namedInput(draft, 'oxygen', '%')!, basis: 'volume' } : undefined,
    },
    fuel: {
      material: declared(draft, 'material'), thermal_regime: declared(draft, 'thermal_regime'),
      geometry: {
        shape: declared(draft, 'geometry.shape'), length: namedInput(draft, 'geometry.length', 'm'),
        width: namedInput(draft, 'geometry.width', 'm'), full_thickness: namedInput(draft, 'geometry.full_thickness', 'm'),
      },
    },
    model_inputs: modelInputs(draft, registry.models),
    assumptions: Object.fromEntries(Object.entries(draft.acknowledgments).filter(([, value]) => value)
      .map(([key]) => [key, assumption('acknowledged')])),
    evidence_context: {},
  }
}
export function candidateStatus(candidate?: CandidateAssessment, assessment?: ScenarioAssessment) {
  if (candidate?.compatibility === 'incompatible') return 'INCOMPATIBLE'
  return candidate?.readiness === 'eligible'
    && assessment?.selected_models[candidate.model.available_output] === candidate.model.model_id ? 'AVAILABLE' : 'BLOCKED'
}
export function canEvaluate(assessment: ScenarioAssessment | undefined, draft: ScenarioDraft) {
  return !!assessment && assessment.scenario_id === draft.id && assessment.revision === draft.revision
    && assessment.blocked_outputs.length === 0
    && assessment.selected_models.dimensionless_branch === DIMENSIONLESS_MODEL
}
export function alternativeChoice(draft: ScenarioDraft, model: ScenarioModel, index: string): ScenarioDraft {
  const prefix = `model_inputs.${model.model_id}.`
  const values = { ...draft.values, [`alternative.${model.model_id}`]: index }
  for (const key of Object.keys(model.alternative_parameter_units)) delete values[prefix + key]
  return { ...draft, values }
}
export function activeParameters(draft: ScenarioDraft, model: ScenarioModel) {
  const alternative = draft.values[`alternative.${model.model_id}`]
  return { ...model.required_parameters, ...Object.fromEntries(
    (model.parameter_alternatives[Number(alternative)] ?? [])
      .filter(() => alternative !== undefined && alternative !== '')
      .map((key) => [key, model.alternative_parameter_units[key]]),
  ) }
}
