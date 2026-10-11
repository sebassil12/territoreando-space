import { useState } from 'react'
import type { Comparison, ComparisonFactor, SampleConditions } from '../api'
import { useT } from '../i18n'
import { useGet } from '../useGet'
import { ErrorText, SourceCitation, WarningBanner, Warnings } from '../ui'
import { useLabel } from '../useLabel'

const MIN_SAMPLES = 2

export function Compare() {
  const { t } = useT()
  const conditions = useGet<SampleConditions[]>('/api/conditions')
  const [selected, setSelected] = useState<string[]>([])
  const path = selected.length >= MIN_SAMPLES ? `/api/compare?samples=${selected.map(encodeURIComponent).join(',')}` : null
  const comparison = useGet<Comparison>(path)
  const toggle = (s: string) => setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))

  if (conditions.error) return <ErrorText error={t('common.error', { error: conditions.error })} />
  if (!conditions.res) return <p className="text-slate-400">{t('common.loading')}</p>
  return (
    <section className="space-y-4">
      <p className="text-sm text-slate-300">{t('compare.pick')}</p>
      <div className="flex flex-wrap gap-2">
        {conditions.res.data.map((c) => (
          <label key={c.sample} className={`cursor-pointer rounded-md border px-2 py-1 text-sm ${selected.includes(c.sample) ? 'border-orange-500 bg-orange-950/40' : 'border-slate-700'}`}>
            <input type="checkbox" className="mr-1" checked={selected.includes(c.sample)} onChange={() => toggle(c.sample)} />
            {c.folder_label} · {c.material ?? c.psi_record_meaning}
          </label>
        ))}
      </div>
      {comparison.error && <ErrorText error={t('common.error', { error: comparison.error })} />}
      {path && comparison.res && <ComparisonView data={comparison.res.data} warnings={comparison.res.warnings} />}
    </section>
  )
}

function ComparisonView({ data, warnings }: { data: Comparison; warnings: string[] }) {
  const { t } = useT()
  const label = useLabel()
  const names = (factors: string[]) => (factors.length ? factors.map((f) => label('factor', f)).join(', ') : t('common.none'))
  return (
    <div className="space-y-3">
      {data.comparison_status === 'limited'
        ? (
          <WarningBanner title={t('compare.limited')}>
            <p>{t('compare.limitedNote')}</p>
            <ul className="mt-1 list-disc pl-5">
              <li>{t('compare.differing')}: {names(data.differing_factors)}</li>
              <li>{t('compare.missing')}: {names(data.missing_factors)}</li>
              <li>{t('compare.conflicting')}: {names(data.conflicting_factors)}</li>
            </ul>
          </WarningBanner>
        )
        : <p className="text-sm text-slate-300">{t('compare.same')}</p>}
      <Warnings items={warnings} />
      <FactorTable data={data} />
      <p className="text-xs text-slate-400">{t('compare.noConclusion')}</p>
      <div className="text-xs text-slate-400">
        <p className="font-semibold">{t('compare.sources')}</p>
        {data.conditions.map((c) => <p key={c.sample}>{c.folder_label}: <SourceCitation path={c.source_path} location={c.source_location} /></p>)}
      </div>
    </div>
  )
}

function rowStyle(data: Comparison, factor: string) {
  if (data.conflicting_factors.includes(factor)) return 'bg-red-950/40'
  if (data.differing_factors.includes(factor)) return 'bg-sky-950/40'
  if (data.missing_factors.includes(factor)) return 'bg-slate-900'
  return ''
}

function FactorTable({ data }: { data: Comparison }) {
  const { t } = useT()
  const label = useLabel()
  const bySample = Object.fromEntries(data.conditions.map((c) => [c.sample, c]))
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-slate-400">
          <tr>
            <th className="px-2 py-2 font-medium">{t('compare.factor')}</th>
            {data.samples.map((s) => <th key={s} className="px-2 py-2 font-medium">{t('compare.sample', { sample: s })}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.factors.map((f) => (
            <tr key={f.factor} className={`border-t border-slate-800 ${rowStyle(data, f.factor)}`}>
              <td className="px-2 py-1.5 font-medium">{label('factor', f.factor)}</td>
              {data.samples.map((s) => <td key={s} className="px-2 py-1.5"><FactorCell factor={f} sample={s} row={bySample[s]} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Un valor en conflicto muestra ambos valores citados (p. ej. flujo de S6: DoD frente a urban2019).
function FactorCell({ factor, sample, row }: { factor: ComparisonFactor; sample: string; row?: SampleConditions }) {
  const { t } = useT()
  const status = factor.status[sample]
  if (status === 'conflicting' && factor.factor === 'airflow_cm_s' && row) {
    return <span className="text-red-200">⚠ {t('compare.conflicting')}: DoD {row.airflow_cm_s_dod} · urban2019 {row.airflow_cm_s_urban2019}</span>
  }
  if (status === 'conflicting') return <span className="text-red-200">⚠ {t('compare.conflicting')}</span>
  if (status === 'unknown') return <span className="italic text-slate-500">{t('compare.notReported')}</span>
  return <>{factor.values[sample]}</>
}
