import { isKey, useT } from '../i18n'
import type { ScenarioUnit } from '../api'
import { ValueField } from './InputFields'

export function ParameterDescription({ name, unit }: { name: string; unit: ScenarioUnit }) {
  const { t } = useT()
  const title = `guide.${name}.name`
  const help = `guide.${name}.help`
  return <div className="space-y-1 text-sm">
    <p className="text-slate-200">{isKey(title) ? t(title) : name} <span className="font-mono text-xs text-sky-300">{name} · {unit}</span></p>
    {isKey(help) && <p className="text-xs leading-relaxed text-slate-400">{t(help)}</p>}
  </div>
}
export function ParameterField({ name, unit, value, onChange }: {
  name: string; unit: ScenarioUnit; value: string; onChange: (value: string) => void
}) {
  const { t } = useT()
  const title = `guide.${name}.name`
  const help = `guide.${name}.help`
  return <div className="space-y-2">
    <ValueField name={name} label={t('guide.inputLabel', { name: isKey(title) ? t(title) : name, symbol: name })}
      unit={unit} value={value} onChange={onChange} descriptionId={`${name}-help`} />
    {isKey(help) && <p id={`${name}-help`} className="text-xs leading-relaxed text-slate-400">{t(help)}</p>}
  </div>
}
