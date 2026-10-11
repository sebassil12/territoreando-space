import { useMemo, useState } from 'react'
import type { Finding } from '../api'
import { useT } from '../i18n'
import { useGet } from '../useGet'
import { ErrorText, Warnings } from '../ui'
import { useLabel } from '../useLabel'
import { FindingCard } from './FindingCard'

const FILTERS = ['theme', 'sample', 'material', 'evidence_type', 'confidence'] as const
type FilterKey = (typeof FILTERS)[number]
const LABEL_PREFIX: Partial<Record<FilterKey, string>> = { theme: 'theme', evidence_type: 'evidence', confidence: 'level' }

// Opciones de filtro solo para valores presentes en los datos; un filtro sin valores no se muestra.
function filterOptions(findings: Finding[]) {
  return Object.fromEntries(FILTERS.map((k) => [k, [...new Set(findings.map((f) => f[k]).filter(Boolean) as string[])].sort()]))
}

export function FindingsExplorer() {
  const { t } = useT()
  const { res, error } = useGet<Finding[]>('/api/findings')
  const [filter, setFilter] = useState<Partial<Record<FilterKey, string>>>({})
  const all = useMemo(() => res?.data ?? [], [res])
  const options = useMemo(() => filterOptions(all), [all])
  const rows = all.filter((f) => FILTERS.every((k) => !filter[k] || f[k] === filter[k]))

  if (error) return <ErrorText error={t('common.error', { error })} />
  if (!res) return <p className="text-slate-400">{t('common.loading')}</p>
  return (
    <section className="space-y-4">
      <Warnings items={res.warnings} />
      <FilterBar options={options} filter={filter} onChange={setFilter} />
      <p className="text-xs text-slate-500">{t('finding.count', { n: rows.length, total: all.length })} · {res.source}</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((f) => <FindingCard key={f.finding_id} finding={f} />)}
      </div>
    </section>
  )
}

type FilterBarProps = {
  options: Record<string, string[]>
  filter: Partial<Record<FilterKey, string>>
  onChange: (f: Partial<Record<FilterKey, string>>) => void
}

function FilterBar({ options, filter, onChange }: FilterBarProps) {
  const { t } = useT()
  const label = useLabel()
  return (
    <div className="flex flex-wrap gap-3">
      {FILTERS.filter((k) => options[k].length > 0).map((k) => (
        <label key={k} className="text-sm text-slate-300">
          {t(`filter.${k}`)}
          <select className="input ml-1" value={filter[k] ?? ''} onChange={(e) => onChange({ ...filter, [k]: e.target.value })}>
            <option value="">{t('catalog.all')}</option>
            {options[k].map((v) => <option key={v} value={v}>{LABEL_PREFIX[k] ? label(LABEL_PREFIX[k], v) : v}</option>)}
          </select>
        </label>
      ))}
    </div>
  )
}
