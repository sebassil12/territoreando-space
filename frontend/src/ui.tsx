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
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${QUALITY_STYLE[quality] ?? QUALITY_STYLE.unknown}`}>
      <span aria-hidden>{QUALITY_ICON[quality] ?? '?'}</span>
      {quality.replaceAll('_', ' ')}
    </span>
  )
}

export function Warnings({ items, empty }: { items: string[]; empty?: string }) {
  if (!items.length) return empty ? <p className="text-xs text-slate-500">{empty}</p> : null
  return (
    <ul className="space-y-1 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-sm text-amber-100" aria-label="Warnings">
      {items.map((w) => <li key={w}>⚠ {w}</li>)}
    </ul>
  )
}
