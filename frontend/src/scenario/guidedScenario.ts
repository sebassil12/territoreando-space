import type { ScenarioModel } from '../api'
import { blankDraft, type ScenarioDraft } from './scenarioDraft'

// Selecting the labelled setup is an explicit acknowledgment, not an inferred experiment.
export function chooseModel(current: ScenarioDraft, model: ScenarioModel): ScenarioDraft {
  return {
    ...blankDraft(current.id), revision: current.revision,
    preference: model.model_id, output: model.available_output,
    values: {
      'airflow.direction': model.flow_configuration,
      thermal_regime: model.thermal_regime,
      ...(model.gravity_regime ? { gravity_regime: model.gravity_regime } : {}),
    },
    acknowledgments: Object.fromEntries(model.required_assumptions.map((key) => [key, true])),
  }
}

// Presentation is deliberately unable to consume mathematical outputs or physical quantities.
export type SceneDescription = {
  mode?: 'steady_playback'
  flow: 'opposed' | 'concurrent' | 'unspecified'
  gravity: string
  shape: 'sheet' | 'slab' | 'generic'
}
export function describeScene(draft: Pick<ScenarioDraft, 'values'>): SceneDescription {
  const direction = draft.values['airflow.direction']
  const shape = draft.values['geometry.shape']
  return {
    flow: direction === 'opposed' || direction === 'concurrent' ? direction : 'unspecified',
    gravity: draft.values.gravity_regime || 'unknown',
    shape: shape === 'sheet' || shape === 'slab' ? shape : 'generic',
  }
}
