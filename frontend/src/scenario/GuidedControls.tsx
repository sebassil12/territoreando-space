import { useEffect, useEffectEvent } from 'react'
import type { ScenarioModel } from '../api'
import { useT } from '../i18n'
import { useLabel } from '../useLabel'
import { ModelSource } from './ScenarioModels'
import { ParameterDescription, ParameterField } from './ParameterField'
import { Configuration } from './ScenarioFields'
import { chooseModel } from './guidedScenario'
import { DIMENSIONLESS_MODEL } from './scenarioDraft'
import type { ScenarioBuilderState } from './useScenarioBuilder'

const modelCopy = (model: ScenarioModel) => model.model_id === DIMENSIONLESS_MODEL ? 'thin'
  : model.model_id === 'bhattacharjee2016_critical_flow' ? 'critical' : 'urban'
export function ModelChooser({ models, state }: { models: ScenarioModel[]; state: ScenarioBuilderState }) {
  const { t } = useT()
  return <section className="space-y-3">
    <h3 className="text-sm font-semibold text-sky-200">{t('guide.choose')}</h3>
    <p className="text-xs leading-relaxed text-slate-400">{t('guide.selectionNote')}</p>
    {models.map((model) => <article key={model.model_id} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <span className={`text-xs ${model.implemented ? 'text-emerald-300' : 'text-amber-200'}`}>{t(model.implemented ? 'guide.ready' : 'guide.blocked')}</span>
      <h4 className="font-semibold">{t(`guide.${modelCopy(model)}Title`)}</h4>
      <p className="text-sm text-slate-400">{t(`guide.${modelCopy(model)}Description`)}</p>
      <SetupConditions model={model} />
      <ModelSource source={model.source} />
      <button type="button" data-testid={`choose-${model.model_id}`} className="btn w-full border-sky-800 bg-sky-950/60 text-sm"
        onClick={() => state.edit((current) => chooseModel(current, model))}>{t(model.implemented ? 'guide.select' : 'guide.inspect')}</button>
    </article>)}
  </section>
}
function SetupConditions({ model }: { model: ScenarioModel }) {
  const { t } = useT()
  const label = useLabel()
  return <div className="space-y-1 text-xs text-slate-300">
    <p>{label('twin', model.flow_configuration)} · {label('twin', model.gravity_regime ?? 'unknown')} · {label('twin', model.thermal_regime)}</p>
    {model.required_assumptions.map((key) => <p key={key}>{label('twin.assumption', key)}</p>)}
    <p className="text-slate-500">{t('twin.assumptionNote')}</p>
  </div>
}
export function GuidedControls({ model, state }: { model: ScenarioModel; state: ScenarioBuilderState }) {
  const { t } = useT()
  // Research selection immediately exposes the engine's evidence report; later edits need rechecking.
  const inspectRequirements = useEffectEvent(() => { void state.run('assess') })
  useEffect(() => { if (!model.implemented) inspectRequirements() }, [model.model_id, model.implemented])
  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-sky-200">{t(model.implemented ? 'guide.inputs' : 'guide.blockedHelp')}</h3>
      <button type="button" className="text-xs text-slate-400 underline" onClick={state.reset}>{t('guide.change')}</button>
    </div>
    <h4 className="text-lg font-semibold">{t(`guide.${modelCopy(model)}Title`)}</h4>
    {model.implemented ? <PrimaryInputs state={state} model={model} /> : <ResearchRequirements model={model} state={state} />}
    <ModelSource source={model.source} />
    <details className="rounded-xl border border-slate-800 p-4">
      <summary className="cursor-pointer text-sm text-slate-300">{t('guide.advanced')}</summary>
      <div className="mt-4 space-y-4">
        <p className="text-xs text-slate-400">{t('guide.assumptions')}</p>
        <Configuration state={state} models={[model]} />
      </div>
    </details>
  </div>
}
function PrimaryInputs({ state, model }: { state: ScenarioBuilderState; model: ScenarioModel }) {
  const { t } = useT()
  const complete = Object.keys(model.required_parameters).every((key) => state.draft.values[`model_inputs.${model.model_id}.${key}`]?.trim())
  return <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void state.run('calculate') }}>
    {Object.entries(model.required_parameters).map(([key, unit]) => <ParameterField key={key} name={key} unit={unit}
      value={state.draft.values[`model_inputs.${model.model_id}.${key}`] ?? ''}
      onChange={(value) => state.changeValue(`model_inputs.${model.model_id}.${key}`, value)} />)}
    <details className="text-xs text-slate-400"><summary className="cursor-pointer text-sky-300">{t('guide.where')}</summary>
      <p className="mt-2 leading-relaxed">{t('guide.whereBody')}</p></details>
    {!complete && <p className="text-xs text-slate-400">{t('guide.noNumbers')}</p>}
    <button data-testid="calculate" type="submit" disabled={!complete || state.phase !== 'idle'}
      className="btn w-full border-sky-500 bg-sky-600/30 py-3 text-sm font-semibold disabled:opacity-40">
      {t(state.phase === 'idle' ? 'guide.calculate' : 'guide.calculating')}
    </button>
  </form>
}
function ResearchRequirements({ model, state }: { model: ScenarioModel; state: ScenarioBuilderState }) {
  const { t } = useT()
  const candidate = state.assessment?.data.candidates.find((item) => item.model.model_id === model.model_id)
  const parameters = { ...model.required_parameters, ...model.alternative_parameter_units }
  return <div className="space-y-4 text-sm">
    <p className="rounded-lg border border-amber-800 bg-amber-950/30 p-3 text-amber-100">{t(`guide.${modelCopy(model)}Description`)}</p>
    <p className="text-slate-400">{t('guide.blockedInputs')}</p>
    <div className="space-y-4">{Object.entries(parameters).filter(([name]) => !candidate
      || candidate.missing_parameters.some((path) => path.includes(name))).map(([name, unit]) =>
      <ParameterDescription key={name} name={name} unit={unit} />)}</div>
    {model.parameter_alternatives.length > 0 && <p className="text-xs text-sky-200">{model.parameter_alternatives.map((group) => group.join(' + ')).join(' / ')}</p>}
    <p className="text-xs text-slate-400">{t('guide.missingContext')}</p>
    <button type="button" data-testid="assess" className="btn w-full" disabled={state.phase !== 'idle'} onClick={() => { void state.run('assess') }}>{t('guide.check')}</button>
  </div>
}
