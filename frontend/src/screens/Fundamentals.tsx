import { useT, type Key } from '../i18n'
import { CONCEPTS, STUDY_PHASES, type Concept } from '../onboarding/content'
import { RefLine } from '../onboarding/RefLine'

const byId = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]))

// Prerequisite concepts grouped by the suggested study order; each links to the screen where it appears.
export function Fundamentals() {
  const { t } = useT()
  return (
    <article className="max-w-4xl space-y-8 leading-relaxed">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold">{t('fund.title')}</h2>
        <p className="text-slate-300">{t('fund.intro')}</p>
        <nav aria-label={t('fund.path')} className="rounded-lg border border-slate-700 p-4 text-sm">
          <h3 className="mb-2 font-semibold">{t('fund.path')}</h3>
          <ol className="space-y-1 text-slate-300">
            {STUDY_PHASES.map((p) => (
              <li key={p.id}>{t(`fund.phase.${p.id}` as Key)}: {p.concepts.map((id) => t(`fund.${id}.title` as Key)).join(' → ')}</li>
            ))}
          </ol>
        </nav>
      </header>
      {STUDY_PHASES.map((p) => (
        <section key={p.id} className="space-y-3">
          <h3 className="text-lg font-semibold text-orange-300">{t(`fund.phase.${p.id}` as Key)}</h3>
          <div className="grid gap-3 md:grid-cols-2">{p.concepts.map((id) => <ConceptCard key={id} concept={byId[id]} />)}</div>
        </section>
      ))}
    </article>
  )
}

function ConceptCard({ concept: c }: { concept: Concept }) {
  const { t } = useT()
  const key = (suffix: string) => `fund.${c.id}.${suffix}` as Key
  return (
    <section className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm">
      <h4 className="font-semibold text-slate-100">{t(key('title'))}</h4>
      <p className="text-slate-300">{t(key('body'))}</p>
      {c.analogy && <p className="border-l-2 border-sky-700 pl-2 text-slate-300"><span className="font-semibold text-sky-300">{t('fund.analogyLabel')}:</span> {t(key('analogy'))}</p>}
      <p className="text-slate-400">
        <span className="font-semibold">{t('fund.whereLabel')}:</span> {t(key('where'))}{' '}
        <a className="text-sky-300 underline" href={`#${c.route}`}>{t('fund.open')}</a>
      </p>
      <RefLine source={c.source} />
    </section>
  )
}
