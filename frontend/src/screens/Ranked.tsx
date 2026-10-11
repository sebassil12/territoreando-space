import type { Ranked as RankedData, RankingCriteria, ScoreItem } from '../api'
import { useT } from '../i18n'
import { useGet } from '../useGet'
import { ErrorText, WarningBanner, Warnings } from '../ui'
import { useLabel } from '../useLabel'
import { FindingCard } from './FindingCard'

const CRITERION_PREFIX: Record<string, string> = { safety_relevance: 'level', confidence: 'level', evidence_type: 'evidence', data_status: 'status' }

export function Ranked() {
  const { t } = useT()
  const { res, error } = useGet<RankedData>('/api/findings/ranked')
  if (error) return <ErrorText error={t('common.error', { error })} />
  if (!res) return <p className="text-slate-400">{t('common.loading')}</p>
  const { ranking_criteria, findings } = res.data
  return (
    <section className="space-y-4">
      <WarningBanner title={t('ranked.disclaimer')}>{ranking_criteria.note}</WarningBanner>
      <Warnings items={res.warnings} />
      <Criteria criteria={ranking_criteria} />
      <ol className="space-y-3">
        {findings.map((f) => (
          <li key={f.finding_id} className="flex gap-3">
            <span className="w-8 shrink-0 pt-4 text-right font-mono text-slate-500">#{f.rank}</span>
            <div className="flex-1">
              <FindingCard finding={f}>
                <Breakdown score={f.score} items={f.score_breakdown} />
              </FindingCard>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Criteria({ criteria }: { criteria: RankingCriteria }) {
  const { t } = useT()
  const label = useLabel()
  return (
    <details className="rounded-lg border border-slate-800 p-3 text-sm" open>
      <summary className="cursor-pointer font-semibold">{t('ranked.criteria')}</summary>
      <ul className="mt-2 space-y-1">
        {Object.entries(criteria.rules).map(([criterion, table]) => (
          <li key={criterion}>
            <span className="font-medium">{label('criterion', criterion)}:</span>{' '}
            {Object.entries(table).map(([value, points]) => `${label(CRITERION_PREFIX[criterion], value)} ${signed(points)}`).join(' · ')}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-slate-400">{t('ranked.tieBreak')}: <span className="font-mono text-xs">{criteria.tie_break.join(' → ')}</span></p>
    </details>
  )
}

function Breakdown({ score, items }: { score: number; items: ScoreItem[] }) {
  const { t } = useT()
  const label = useLabel()
  return (
    <p className="rounded bg-slate-950 px-2 py-1 text-xs text-slate-300">
      <span className="font-semibold">{t('ranked.score', { score })}</span> ={' '}
      {items.map((i) => `${label('criterion', i.criterion)} (${label(CRITERION_PREFIX[i.criterion], i.value)}) ${signed(i.points)}`).join(' · ')}
    </p>
  )
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))
