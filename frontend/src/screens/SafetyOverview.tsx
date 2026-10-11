import type { Finding } from '../api'
import { useT } from '../i18n'
import { useGet } from '../useGet'
import { ErrorText, EvidenceTypeBadge, SourceCitation } from '../ui'

// Afirmaciones del "por qué": solo hallazgos citados, en este orden (flujo típico → estado cuasi-estacionario →
// tamaño de llama y calor → relevancia del algodón → límites de generalización).
const WHY_FINDINGS = ['F-urban2019-008', 'F-urban2019-007', 'F-urban2019-006', 'F-urban2019-014', 'F-urban2019-009']
const KNOWN = (f: Finding) => f.evidence_type === 'published_result' && f.safety_relevance === 'high'
const MISSING = (f: Finding) => f.evidence_type === 'data_quality_note' && f.data_status !== 'complete'

export function SafetyOverview() {
  const { t } = useT()
  const { res, error } = useGet<Finding[]>('/api/findings')
  if (error) return <ErrorText error={t('common.error', { error })} />
  if (!res) return <p className="text-slate-400">{t('common.loading')}</p>
  const findings = res.data
  const byId = Object.fromEntries(findings.map((f) => [f.finding_id, f]))
  const count = (type: string) => findings.filter((f) => f.evidence_type === type).length
  return (
    <article className="max-w-4xl space-y-6 leading-relaxed">
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t('overview.why')}</h2>
        <ul className="space-y-2">
          {WHY_FINDINGS.filter((id) => byId[id]).map((id) => <CitedStatement key={id} finding={byId[id]} />)}
        </ul>
        <p className="text-xs text-slate-500">{t('overview.whyNote')}</p>
      </section>
      <section className="rounded-lg border border-slate-700 p-4 text-sm">
        <h3 className="mb-2 font-semibold">{t('overview.purpose')}</h3>
        <ul className="list-disc space-y-1 pl-5 text-slate-300">
          {(['overview.purpose1', 'overview.scope1', 'overview.scope2', 'overview.scope3'] as const).map((k) => <li key={k}>{t(k)}</li>)}
        </ul>
      </section>
      <section className="text-sm">
        <h3 className="mb-1 font-semibold">{t('overview.coverage')}</h3>
        <p className="text-slate-300">{t('overview.coverageText', { n: findings.length, published: count('published_result'), notes: count('data_quality_note') })}</p>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <FindingList title={t('overview.known')} note={t('overview.knownNote')} items={findings.filter(KNOWN)} tone="text-emerald-300" />
        <FindingList title={t('overview.missing')} note={t('overview.missingNote')} items={findings.filter(MISSING)} tone="text-amber-300" />
      </div>
    </article>
  )
}

function CitedStatement({ finding: f }: { finding: Finding }) {
  return (
    <li className="rounded-md border-l-2 border-orange-600 bg-slate-900/40 px-3 py-2">
      <p>{f.summary}</p>
      <p className="mt-1 text-xs">
        <a className="mr-2 font-mono text-sky-300 underline" href={`#Findings/${f.finding_id}`}>{f.finding_id}</a>
        <SourceCitation path={f.source_path} location={f.source_location} />
      </p>
    </li>
  )
}

function FindingList({ title, note, items, tone }: { title: string; note: string; items: Finding[]; tone: string }) {
  return (
    <section className="text-sm">
      <h3 className={`font-semibold ${tone}`}>{title}</h3>
      <p className="mb-2 text-xs text-slate-500">{note}</p>
      <ul className="space-y-2">
        {items.map((f) => (
          <li key={f.finding_id}>
            <a className="text-sky-300 underline" href={`#Findings/${f.finding_id}`}>{f.title}</a>{' '}
            <EvidenceTypeBadge type={f.evidence_type} />
            <div className="text-xs text-slate-500"><SourceCitation path={f.source_path} location={f.source_location} /></div>
          </li>
        ))}
      </ul>
    </section>
  )
}
