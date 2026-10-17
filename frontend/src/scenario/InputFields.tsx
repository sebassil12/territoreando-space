import { useT } from '../i18n'

type Options = { value: string; label: string }[]
export function SelectField({ name, label, value, options, onChange, allowEmpty = true }: {
  name: string; label: string; value: string; options: Options; onChange: (value: string) => void; allowEmpty?: boolean
}) {
  const { t } = useT()
  return <label className="block space-y-1 text-sm text-slate-300">
    <span>{label}</span>
    <select name={name} className="input w-full" value={value} onChange={(event) => onChange(event.target.value)}>
      {allowEmpty && <option value="">{t('twin.choose')}</option>}
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
}
export function ValueField({ name, label, value, unit, onChange, descriptionId }: {
  name: string; label: string; value: string; unit?: string; onChange: (value: string) => void; descriptionId?: string
}) {
  return <label className="block space-y-1 text-sm text-slate-300">
    <span className="flex justify-between gap-2"><span>{label}</span><span className="text-xs text-sky-300">{unit}</span></span>
    <input name={name} className="input w-full" type="text" inputMode={unit ? 'decimal' : 'text'}
      aria-describedby={descriptionId} autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
}
