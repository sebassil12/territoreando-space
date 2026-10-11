import { isKey, useT } from './i18n'
import { useLabel } from './useLabel'

const QUALITY_STYLE: Record<string, string> = {
  continuous: 'bg-emerald-900/60 text-emerald-200',
  gap_detected: 'bg-red-900/60 text-red-200',
  overlapping_variant: 'bg-amber-900/60 text-amber-200',
  incomplete: 'bg-orange-900/60 text-orange-200',
  unknown: 'bg-slate-800 text-slate-300',
}

const QUALITY_ICON: Record<string, string> = {
  continuous: '✓',
  gap_detected: '⚠',
  overlapping_variant: '⧉',
  incomplete: '…',
  unknown: '?',
}

export function QualityBadge({ quality }: { quality: string }) {
  const { t } = useT()
  const key = `quality.${quality}`
  // Se traduce la etiqueta mostrada; el código original queda en el tooltip.
  return (
    <span title={quality} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${QUALITY_STYLE[quality] ?? QUALITY_STYLE.unknown}`}>
      <span aria-hidden>{QUALITY_ICON[quality] ?? '?'}</span>
      {isKey(key) ? t(key) : quality.replaceAll('_', ' ')}
    </span>
  )
}

export function Warnings({ items, empty }: { items: string[]; empty?: string }) {
  const { t } = useT()
  if (!items.length) return empty ? <p className="text-xs text-slate-500">{empty}</p> : null
  return (
    <ul className="space-y-1 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-sm text-amber-100" aria-label={t('ui.warnings')}>
      {items.map((w) => <li key={w}>⚠ {w}</li>)}
    </ul>
  )
}

const EVIDENCE_STYLE: Record<string, string> = {
  published_result: 'bg-violet-900/60 text-violet-200',
  instrument_measurement: 'bg-sky-900/60 text-sky-200',
  image_observation: 'bg-teal-900/60 text-teal-200',
  derived_metric: 'bg-slate-700 text-slate-200',
  data_quality_note: 'bg-amber-900/60 text-amber-200',
}

const LEVEL_STYLE: Record<string, string> = {
  high: 'bg-emerald-900/60 text-emerald-200',
  medium: 'bg-sky-900/60 text-sky-200',
  low: 'bg-slate-800 text-slate-300',
}

export function EvidenceTypeBadge({ type }: { type: string }) {
  const label = useLabel()
  return <span title={type} className={`rounded px-2 py-0.5 text-xs font-medium ${EVIDENCE_STYLE[type] ?? LEVEL_STYLE.low}`}>{label('evidence', type)}</span>
}

export function LevelBadge({ kind, level }: { kind: 'confidence' | 'safety'; level: string }) {
  const { t } = useT()
  const label = useLabel()
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${LEVEL_STYLE[level] ?? LEVEL_STYLE.low}`}>
      {t(kind === 'confidence' ? 'finding.confidence' : 'finding.safety')}: {label('level', level)}
    </span>
  )
}

export function SourceCitation({ path, location }: { path: string; location: string }) {
  return <span className="font-mono text-xs text-sky-300">{path.split('/').pop()} · {location}</span>
}

export function Cite({ children }: { children: React.ReactNode }) {
  return <sup className="ml-0.5 text-xs text-sky-300">[{children}]</sup>
}

export function WarningBanner({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div role="note" className="rounded-lg border border-amber-600 bg-amber-950/50 p-3 text-sm text-amber-100">
      <p className="font-semibold">⚠ {title}</p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="font-semibold text-slate-300">{label}</dt><dd>{children}</dd></div>
}

export function ErrorText({ error }: { error: string }) {
  return <p className="text-red-300">{error}</p>
}

const INCOMPLETE_QUALITIES = new Set(['gap_detected', 'incomplete', 'unknown'])

// Aviso visible de secuencia incompleta (huecos temporales o calidad desconocida); no apta para tasas.
export function IncompleteBadge({ quality }: { quality?: string }) {
  const { t } = useT()
  if (!quality || !INCOMPLETE_QUALITIES.has(quality)) return null
  return <span className="rounded border border-red-700 px-2 py-0.5 text-xs font-semibold text-red-200">⚠ {t('evidenceTab.incomplete')}</span>
}
