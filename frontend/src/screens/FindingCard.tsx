import type { ReactNode } from 'react'
import type { Finding } from '../api'
import { useT } from '../i18n'
import { EvidenceTypeBadge, LevelBadge, SourceCitation } from '../ui'
import { useLabel } from '../useLabel'

// Tarjeta presentacional de un hallazgo; `children` permite añadir contenido (p. ej. desglose del puntaje).
export function FindingCard({ finding: f, showLink = true, children }: { finding: Finding; showLink?: boolean; children?: ReactNode }) {
  const { t } = useT()
  const label = useLabel()
  return (
    <article className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm">
      <header className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-slate-500">{f.finding_id}</span>
        <EvidenceTypeBadge type={f.evidence_type} />
        <span className="rounded bg-slate-800 px-2 py-0.5 text-xs">{label('theme', f.theme)}</span>
        {f.sample && <span className="rounded bg-slate-800 px-2 py-0.5 text-xs">{t('finding.sample', { sample: f.sample })}</span>}
        <span className={`rounded px-2 py-0.5 text-xs ${f.data_status === 'complete' ? 'bg-slate-800' : 'bg-amber-900/60 text-amber-200'}`}>
          {t('finding.dataStatus')}: {label('status', f.data_status)}
        </span>
      </header>
      <h3 className="text-base font-semibold">{f.title}</h3>
      <p className="text-slate-300">{f.summary}</p>
      <Rationale badge={<LevelBadge kind="confidence" level={f.confidence} />} text={f.confidence_rationale} />
      <Rationale badge={<LevelBadge kind="safety" level={f.safety_relevance} />} text={f.safety_relevance_rationale} />
      {f.limitations.length > 0 && (
        <details>
          <summary className="cursor-pointer text-slate-400">{t('finding.limitations')} ({f.limitations.length})</summary>
          <ul className="mt-1 list-disc pl-5 text-slate-400">{f.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        </details>
      )}
      <p className="text-slate-400">{t('finding.source')}: <SourceCitation path={f.source_path} location={f.source_location} /></p>
      {children}
      {showLink && <a className="btn inline-block" href={`#Findings/${f.finding_id}`}>{t('finding.open')}</a>}
    </article>
  )
}

function Rationale({ badge, text }: { badge: ReactNode; text: string }) {
  return <p className="text-slate-400">{badge} <span className="ml-1">{text}</span></p>
}
