import type { FindingView, RelatedSequence, SampleConditions } from '../api'
import { useT } from '../i18n'
import { useGet } from '../useGet'
import { ErrorText, Field, IncompleteBadge, QualityBadge, SourceCitation, Warnings } from '../ui'
import { FindingCard } from './FindingCard'

export function FindingDetail({ findingId }: { findingId: string }) {
  const { t } = useT()
  const { res, error } = useGet<FindingView>(`/api/findings/${encodeURIComponent(findingId)}`)
  if (error) return <ErrorText error={t('common.error', { error })} />
  if (!res) return <p className="text-slate-400">{t('common.loading')}</p>
  const { finding: f, conditions, related_sequences } = res.data
  return (
    <section className="max-w-4xl space-y-5">
      <a className="text-sm text-sky-300 underline" href="#Findings">{t('finding.back')}</a>
      <FindingCard finding={f} showLink={false}>
        <dl className="space-y-2 border-t border-slate-800 pt-2">
          <Field label={t('finding.observation')}>{f.observation}</Field>
          {f.value !== null && <Field label={t('finding.value')}>{f.value} {f.unit}</Field>}
          {f.condition && <Field label={t('finding.condition')}>{f.condition}</Field>}
          {f.source_quote && <Field label={t('finding.quote')}><q className="italic text-slate-300">{f.source_quote}</q></Field>}
        </dl>
      </FindingCard>
      {conditions && <ConditionsTable row={conditions} />}
      <RelatedSequences items={related_sequences} />
    </section>
  )
}

const CONDITION_FIELDS = ['material', 'thickness_mm', 'airflow_cm_s_dod', 'airflow_cm_s_urban2019', 'airflow_status',
  'igniter_position', 'oxygen_pct', 'pressure_atm', 'dimensions_cm', 'jpeg_received', 'jpeg_local', 'confidence', 'notes'] as const

function ConditionsTable({ row }: { row: SampleConditions }) {
  const { t } = useT()
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{t('finding.conditions')} · {row.folder_label} ({row.psi_record_meaning})</h3>
      <table className="text-sm">
        <tbody>
          {CONDITION_FIELDS.map((k) => (
            <tr key={k} className="border-t border-slate-800">
              <th className="py-1 pr-4 text-left font-mono text-xs font-normal text-slate-400">{k}</th>
              <td className="py-1">{row[k] ?? <span className="text-slate-500">{t('compare.notReported')}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-400">{t('finding.source')}: <SourceCitation path={row.source_path} location={row.source_location} /></p>
    </div>
  )
}

function RelatedSequences({ items }: { items: RelatedSequence[] }) {
  const { t } = useT()
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{t('finding.related')}</h3>
      <p className="text-xs text-slate-400">{t('finding.relatedNote')}</p>
      {items.length === 0 && <p className="text-sm text-slate-500">{t('finding.noRelated')}</p>}
      {items.map((s) => <RelatedRow key={s.sequence_id} seq={s} />)}
    </div>
  )
}

function RelatedRow({ seq }: { seq: RelatedSequence }) {
  const { t } = useT()
  return (
    <div className="space-y-1 rounded-lg border border-slate-800 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {seq.available
          ? <a className="font-mono text-xs text-sky-300 underline" href={`#Viewer/${seq.sequence_id}`}>{seq.sequence_id}</a>
          : <span className="font-mono text-xs">{seq.sequence_id} ({t('finding.notInCatalog')})</span>}
        {seq.temporal_quality && <QualityBadge quality={seq.temporal_quality} />}
        <IncompleteBadge quality={seq.available ? seq.temporal_quality : 'unknown'} />
        {seq.file_type && <span className="text-xs text-slate-400">{seq.file_type} · {seq.processing_variant} · {seq.n_files} · {seq.duration_s} s</span>}
      </div>
      <Warnings items={seq.warnings} />
    </div>
  )
}
