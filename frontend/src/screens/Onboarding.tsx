import { useT, type Key } from '../i18n'
import { ONBOARDING_STEPS, type StepId } from '../onboarding/content'
import { DataStep, ExploreStep, LearnedStep, TextStep, UnknownsStep } from '../onboarding/steps'

const TOTAL = ONBOARDING_STEPS.length

function StepBody({ step }: { step: StepId }) {
  if (step === 'data') return <DataStep />
  if (step === 'learned') return <LearnedStep />
  if (step === 'unknowns') return <UnknownsStep />
  if (step === 'explore') return <ExploreStep />
  return <TextStep step={step} />
}

// Guided landing: one step per hash route (#Onboarding/<n>), so links, back button and keyboard all work natively.
export function Onboarding({ step }: { step: number }) {
  const { t } = useT()
  const n = Math.min(Math.max(Math.trunc(step) || 1, 1), TOTAL)
  const id = ONBOARDING_STEPS[n - 1]
  return (
    <article className="max-w-4xl space-y-6 leading-relaxed">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold">{t('onb.title')}</h2>
        <p className="text-slate-300">{t('onb.intro')}</p>
        <a className="text-sm text-sky-300 underline" href="#Fundamentals">{t('onb.newHere')}</a>
      </header>
      <StepNav n={n} />
      <section aria-labelledby="onb-step-title" className="space-y-4">
        <h3 id="onb-step-title" className="text-lg font-semibold text-orange-300">{t(`onb.step.${id}.title` as Key)}</h3>
        <StepBody step={id} />
      </section>
      <div className="flex justify-between">
        {n > 1 ? <a className="btn" href={`#Onboarding/${n - 1}`}>{t('onb.prev')}</a> : <span />}
        {n < TOTAL && <a className="btn" href={`#Onboarding/${n + 1}`}>{t('onb.next')}</a>}
      </div>
    </article>
  )
}

function StepNav({ n }: { n: number }) {
  const { t } = useT()
  return (
    <nav aria-label={t('onb.steps')} className="space-y-2">
      <p className="text-xs text-slate-400">{t('onb.progress', { n, total: TOTAL })}</p>
      <div role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={n} aria-label={t('onb.steps')} className="h-1.5 w-full rounded bg-slate-800">
        <div className="h-full rounded bg-orange-500" style={{ width: `${(n / TOTAL) * 100}%` }} />
      </div>
      <ol className="flex flex-wrap gap-1 text-xs">
        {ONBOARDING_STEPS.map((s, i) => (
          <li key={s}>
            <a href={`#Onboarding/${i + 1}`} aria-current={i + 1 === n ? 'step' : undefined}
              className={`block rounded px-2 py-1 ${i + 1 === n ? 'bg-orange-600 text-white' : i + 1 < n ? 'bg-slate-700 text-slate-200' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {i + 1}. {t(`onb.step.${s}.title` as Key)}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
