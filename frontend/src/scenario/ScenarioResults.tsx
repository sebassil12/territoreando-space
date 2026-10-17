import type { Envelope, ScenarioModel, ScenarioRegistry } from '../api'
import { useT } from '../i18n'
import { ModelSource, ScenarioModels } from './ScenarioModels'
import type { ScenarioBuilderState } from './useScenarioBuilder'
import { Warnings } from '../ui'

export function ScenarioResults({ state, registry }: { state: ScenarioBuilderState; registry: Envelope<ScenarioRegistry> }) {
  const { t } = useT()
  const result = state.evaluation?.data.results[0]
  const response = state.evaluation ?? state.failure ?? state.assessment ?? registry
  const assessment = state.assessment?.data ?? state.failure?.data.assessment
  return <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/50 p-5" aria-live="polite">
    <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">{t('guide.result')}</p>
    {state.error && <p role="alert" className="text-sm text-red-200">{t('twin.error', { error: state.error.message })}</p>}
    {result ? <div data-testid="mathematical-result" className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-slate-300">{t('guide.ratio')} <span className="font-mono text-sky-300">eta_f</span></p>
          <p data-testid="eta-f" className="mt-1 font-mono text-3xl text-white">{result.eta_f === null ? t('twin.noReal') : String(result.eta_f)}</p></div>
        <span className="rounded border border-slate-700 px-2 py-1 font-mono text-xs">{result.model_status}</span>
      </div>
      <p className="text-sm text-slate-300">{t(`guide.${result.model_status}`)}</p>
      <p className="text-xs text-slate-400">{t('guide.resultNote')}</p>
      <ModelSource source={result.source} />
    </div> : <p data-testid="empty-result" className="text-sm text-slate-400">{t('guide.pending')}</p>}
    {!!assessment?.blocked_outputs.length && <p className="text-sm text-amber-200">{t('twin.requestBlocked')}</p>}
    <p className="text-xs text-slate-400">{t('twin.quality')}: <span className="font-mono text-amber-200">{response.quality}</span></p>
  </section>
}
export function ScientificDetails({ state, registry, model }: {
  state: ScenarioBuilderState; registry: Envelope<ScenarioRegistry>; model?: ScenarioModel
}) {
  const { t } = useT()
  const response = state.evaluation ?? state.failure ?? state.assessment ?? registry
  const assessment = state.assessment?.data ?? state.failure?.data.assessment
  const result = state.evaluation?.data.results[0]
  return <details className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
    <summary className="cursor-pointer text-sm font-semibold">{t('guide.details')}<span className="mt-1 block text-xs font-normal text-slate-500">{t('guide.detailsHint')}</span></summary>
    <div className="mt-5 space-y-4 text-sm">
      {result && <p className="font-mono">discriminant: {result.discriminant} · {result.evaluator_id} · {result.evaluator_version}</p>}
      <p className="break-words text-xs text-slate-400">{t('twin.source')}: {response.source}</p>
      <p className="text-xs text-amber-200">{t('twin.unused')}: O₂ / airflow speed / pressure / material / dimensions</p>
      <Warnings items={response.warnings} />
      <ScenarioModels models={model ? [model] : registry.data.models} assessment={assessment} />
      {assessment && <div>
        <p className="break-all text-xs">{t('twin.fingerprint')}: {assessment.fingerprint}</p>
        <p className="my-2 text-xs text-slate-300">{t('twin.provenance')}</p>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-400">{JSON.stringify(state.evaluation?.data ?? assessment, null, 2)}</pre>
      </div>}
    </div>
  </details>
}
