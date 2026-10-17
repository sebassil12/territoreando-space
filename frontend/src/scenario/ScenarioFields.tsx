import type { ReactNode } from 'react'
import type { ScenarioModel } from '../api'
import { useT } from '../i18n'
import { useLabel } from '../useLabel'
import { activeParameters, alternativeChoice } from './scenarioDraft'
import { ParameterField } from './ParameterField'
import { SelectField } from './InputFields'
import type { ScenarioBuilderState } from './useScenarioBuilder'

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset className="space-y-3 border-t border-slate-800 pt-3">
    <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</legend>
    {children}
  </fieldset>
}
export function Configuration({ state, models }: { state: ScenarioBuilderState; models: ScenarioModel[] }) {
  const { t } = useT()
  const label = useLabel()
  const select = (name: string, title: string, values: string[]) => <SelectField name={name} label={title}
    value={state.draft.values[name] ?? ''} options={values.map((value) => ({ value, label: label('twin', value) }))}
    onChange={(value) => state.changeValue(name, value)} />
  return <div className="space-y-4">
    <p className="text-xs text-amber-200">{t('twin.inputOrigin')}</p>
    <FieldGroup title={t('twin.direction')}>
      {select('airflow.direction', t('twin.direction'), ['opposed', 'concurrent', 'unknown'])}
      {select('gravity_regime', t('twin.gravity'), ['microgravity', 'normal_gravity', 'other', 'unknown'])}
      {select('thermal_regime', t('twin.thermal'), ['thermally_thin', 'thermally_thick', 'unknown'])}
    </FieldGroup>
    <FieldGroup title={t('twin.geometry')}>
      {select('geometry.shape', t('twin.shape'), ['sheet', 'slab'])}
    </FieldGroup>
    <FieldGroup title={t('twin.assumptions')}>
      <p className="text-xs text-amber-200">{t('twin.assumptionNote')}</p>
      {[...new Set(models.flatMap((model) => model.required_assumptions))].map((key) =>
        <label key={key} className="flex items-start gap-2 text-sm text-slate-300">
          <input name={key} type="checkbox" className="mt-1 accent-sky-500" checked={!!state.draft.acknowledgments[key]}
            onChange={(event) => {
              const checked = event.currentTarget.checked
              state.edit((current) => ({ ...current, acknowledgments: { ...current.acknowledgments, [key]: checked } }))
            }} />
          <span>{label('twin.assumption', key)}</span>
        </label>)}
    </FieldGroup>
    {models.filter((model) => !model.implemented).map((model) => <ModelParameters key={model.model_id} state={state} model={model} />)}
  </div>
}
function ModelParameters({ state, model }: { state: ScenarioBuilderState; model: ScenarioModel }) {
  const { t } = useT()
  const label = useLabel()
  return <details open={model.implemented || model.available_output === state.draft.output} className="rounded border border-slate-800 p-3">
    <summary className="cursor-pointer text-sm">{label('twin.model', model.model_id)}</summary>
    {!model.implemented && <p className="my-2 text-xs text-amber-200">{t('twin.researchOnly')}</p>}
    {!!model.parameter_alternatives.length && <div className="mt-3">
      <SelectField name={`alternative.${model.model_id}`} label={t('twin.alternative')}
        value={state.draft.values[`alternative.${model.model_id}`] ?? ''}
        options={model.parameter_alternatives.map((group, index) => ({ value: String(index), label: group.join(' + ') }))}
        onChange={(value) => state.edit((current) => alternativeChoice(current, model, value))} />
    </div>}
    <div className="mt-3 space-y-3">{Object.entries(activeParameters(state.draft, model)).map(([key, unit]) => {
      const name = `model_inputs.${model.model_id}.${key}`
      return <ParameterField key={key} name={key} unit={unit}
        value={state.draft.values[name] ?? ''} onChange={(value) => state.changeValue(name, value)} />
    })}</div>
  </details>
}
