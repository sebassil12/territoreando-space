import { useMemo, useState } from 'react'
import type { Sequence } from '../api'
import { useT, type Key } from '../i18n'
import { useGet } from '../useGet'
import { ErrorText, IncompleteBadge, QualityBadge, WarningBanner } from '../ui'
import { Viewer } from '../Viewer'

const FILTERS = ['group', 'camera', 'file_type', 'processing_variant', 'temporal_quality'] as const
const COLUMNS: Key[] = ['catalog.sequence', 'catalog.group', 'catalog.channel', 'catalog.type', 'catalog.role', 'catalog.frames',
  'catalog.duration', 'catalog.medianDt', 'catalog.gaps', 'catalog.quality', 'catalog.calibration']

// Encabezado común: las imágenes son evidencia de apoyo, con cobertura local parcial.
function EvidenceHeader() {
  const { t } = useT()
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{t('evidenceTab.title')}</h2>
      <p className="text-sm text-slate-400">{t('evidenceTab.note')}</p>
      <WarningBanner title={t('evidenceTab.partial')}>{t('evidenceTab.partialNote')}</WarningBanner>
    </div>
  )
}

export function EvidenceViewer({ sequenceId }: { sequenceId: string }) {
  const { t } = useT()
  return (
    <section className="space-y-4">
      <a className="text-sm text-sky-300 underline" href="#Evidence">{t('evidenceTab.back')}</a>
      <EvidenceHeader />
      <Viewer key={sequenceId} sequenceId={sequenceId} />
    </section>
  )
}

export function Evidence() {
  const { t } = useT()
  const { res, error } = useGet<Sequence[]>('/api/sequences')
  const [filter, setFilter] = useState<Record<string, string>>({})
  const all = useMemo(() => res?.data ?? [], [res])
  const rows = all.filter((s) => FILTERS.every((k) => !filter[k] || s[k] === filter[k]))
  const options = useMemo(() => Object.fromEntries(FILTERS.map((k) => [k, [...new Set(all.map((s) => s[k]))].sort()])), [all])

  if (error) return <ErrorText error={t('common.error', { error })} />
  return (
    <section className="space-y-4">
      <EvidenceHeader />
      <div className="flex flex-wrap gap-3">
        {FILTERS.map((k) => (
          <label key={k} className="text-sm text-slate-300">
            {t(`filter.${k}`)}
            <select className="input ml-1" value={filter[k] ?? ''} onChange={(e) => setFilter({ ...filter, [k]: e.target.value })}>
              <option value="">{t('catalog.all')}</option>
              {options[k]?.map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-400">
            <tr>{COLUMNS.map((h) => <th key={h} className="px-2 py-2 font-medium">{t(h)}</th>)}</tr>
          </thead>
          <tbody>{rows.map((s) => <SequenceRow key={s.sequence_id} s={s} />)}</tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">{t('catalog.note', { source: res?.source ?? '' })}</p>
    </section>
  )
}

function SequenceRow({ s }: { s: Sequence }) {
  const { t } = useT()
  return (
    <tr className="cursor-pointer border-t border-slate-800 hover:bg-slate-900" onClick={() => { location.hash = `Viewer/${s.sequence_id}` }}>
      <td className="px-2 py-1.5 font-mono text-xs"><a className="text-sky-300 underline" href={`#Viewer/${s.sequence_id}`}>{s.sequence_id}</a></td>
      <td className="px-2">{s.group}</td>
      <td className="px-2">{s.camera}</td>
      <td className="px-2">{s.file_type}</td>
      <td className="px-2 text-xs">{s.sequence_role.replace(/_/g, ' ')}{s.primary_sequence_id && <div className="text-slate-500">{t('catalog.of', { id: s.primary_sequence_id })}</div>}</td>
      <td className="px-2 text-right tabular-nums">{s.n_files}</td>
      <td className="px-2 text-right tabular-nums">{s.duration_s.toFixed(1)} s</td>
      <td className="px-2 text-right tabular-nums">{s.median_diff_ms} ms</td>
      <td className="px-2 text-right tabular-nums">{s.n_gaps_gt_2x}</td>
      <td className="space-x-1 px-2"><QualityBadge quality={s.temporal_quality} /><IncompleteBadge quality={s.temporal_quality} /></td>
      <td className="px-2 text-xs">{s.calibration_status}</td>
    </tr>
  )
}
