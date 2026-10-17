import { useEffect, useState } from 'react'
import { loadScenarioModels, type Envelope, type ScenarioRegistry } from '../api'
import { useT } from '../i18n'
import { GuidedControls, ModelChooser } from '../scenario/GuidedControls'
import { ScenarioResults, ScientificDetails } from '../scenario/ScenarioResults'
import { ScenarioScene } from '../scenario/ScenarioScene'
import { useScenarioBuilder } from '../scenario/useScenarioBuilder'

export function ScenarioBuilder() {
  const { t } = useT()
  const [registry, setRegistry] = useState<Envelope<ScenarioRegistry> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const state = useScenarioBuilder(registry?.data)
  useEffect(() => {
    const controller = new AbortController()
    loadScenarioModels(controller.signal).then((response) => {
      if (!controller.signal.aborted) setRegistry(response)
    }).catch((failure) => { if (!controller.signal.aborted) setError(String(failure)) })
    return () => controller.abort()
  }, [])
  const model = registry?.data.models.find((item) => item.model_id === state.draft.preference)
  return <section className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-sky-400">{t('tab.Twin')}</p>
        <h2 className="text-2xl font-semibold">{t('guide.title')}</h2>
        <p className="mt-2 text-sm text-slate-400">{t('guide.subtitle')}</p></div>
      <button type="button" className="btn text-sm" onClick={state.reset}>{t('twin.new')}</button>
    </header>
    <p className="rounded-lg border-l-2 border-amber-600 bg-amber-950/20 px-4 py-3 text-xs text-amber-100">
      <strong>{t('twin.limitTitle')}. </strong>{t('twin.limitBody')}
    </p>
    {error && <p role="alert" className="text-red-200">{t('twin.registryError', { error })}</p>}
    {!registry && !error && <p className="text-slate-400">{t('common.loading')}</p>}
    {registry && <>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(17rem,0.7fr)_minmax(0,1.8fr)]">
        <aside className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
          {model ? <GuidedControls key={model.model_id} model={model} state={state} /> : <ModelChooser models={registry.data.models} state={state} />}
        </aside>
        <div className="min-w-0 space-y-4">
          {model && <ScenarioResults state={state} registry={registry} />}
          <ScenarioScene draft={state.draft} />
        </div>
      </div>
      <ScientificDetails state={state} registry={registry} model={model} />
    </>}
  </section>
}
