import type { CandidateAssessment, ScenarioAssessment, ScenarioModel } from '../api'
import { useT } from '../i18n'
import { useLabel } from '../useLabel'
import { candidateStatus } from './scenarioDraft'

const STATUS_STYLE = {
  AVAILABLE: 'border-emerald-700 bg-emerald-950/70 text-emerald-200',
  BLOCKED: 'border-amber-700 bg-amber-950/60 text-amber-200',
  INCOMPATIBLE: 'border-red-700 bg-red-950/60 text-red-200',
}
export function ModelSource({ source }: { source: ScenarioModel['source'] }) {
  const { t } = useT()
  const url = typeof source.url === 'string' && source.url.startsWith('https://') ? source.url : undefined
  return <p className="break-words font-mono text-xs text-sky-300">
    <a href={url} target="_blank" rel="noreferrer" className="underline">{source.file}</a>
    {' · '}{source.equation}{' · '}{source.page ? t('twin.page', { page: source.page }) : t('twin.noPage')}
    {!!source.definition_page && <span>{' / '}{t('twin.page', { page: source.definition_page })}</span>}
  </p>
}
export function ScenarioModels({ models, assessment }: { models: ScenarioModel[]; assessment?: ScenarioAssessment }) {
  const { t } = useT()
  return <section className="space-y-3">
    <h3 className="text-sm font-semibold text-slate-200">{t('twin.models')}</h3>
    {models.map((model) => <ModelReadiness key={model.model_id} model={model} assessment={assessment}
      candidate={assessment?.candidates.find((item) => item.model.model_id === model.model_id)} />)}
  </section>
}
export function ModelSummary({ models, assessment }: { models: ScenarioModel[]; assessment?: ScenarioAssessment }) {
  const { t } = useT()
  const label = useLabel()
  return <section className="space-y-2" aria-label={t('twin.models')}>
    <h3 className="text-xs font-semibold text-slate-400">{t('twin.models')}</h3>
    {models.map((model) => {
      const candidate = assessment?.candidates.find((item) => item.model.model_id === model.model_id)
      const status = candidateStatus(candidate, assessment)
      return <button key={model.model_id} type="button" className="flex w-full items-center justify-between gap-2 rounded border border-slate-800 p-2 text-left text-xs"
        onClick={() => document.getElementById(`model-${model.model_id}`)?.scrollIntoView({ block: 'nearest' })}>
        <span>{label('twin.model', model.model_id)}</span>
        <span className={`rounded border px-1.5 py-0.5 font-semibold ${STATUS_STYLE[status]}`}>{status}</span>
      </button>
    })}
  </section>
}
function ModelReadiness({ model, candidate, assessment }: {
  model: ScenarioModel; candidate?: CandidateAssessment; assessment?: ScenarioAssessment
}) {
  const { t } = useT()
  const label = useLabel()
  const status = candidateStatus(candidate, assessment)
  const currentModel = candidate?.model ?? model
  return <article id={`model-${model.model_id}`} data-model-id={model.model_id} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-sm font-semibold">{label('twin.model', model.model_id)}</h4>
      <span className={`rounded border px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[status]}`}>{status}</span>
    </div>
    <p className="text-xs text-slate-400">{t('twin.compatibility')}: {label('twin', candidate?.compatibility ?? 'undetermined')}</p>
    <p className="text-xs text-slate-400">{label('twin.output', model.available_output)}</p>
    <ModelSource source={currentModel.source} />
    <div className="text-xs text-slate-300">
      <p className="font-semibold">{t('twin.evidence')}</p>
      <p className="break-words">{Object.values(currentModel.evidence).filter((value) => typeof value === 'string').join(' / ')}</p>
    </div>
    {!candidate ? <p className="text-xs text-amber-200">{t('twin.notAssessed')}</p> : <ModelBlockers candidate={candidate} />}
    {candidate?.readiness === 'eligible' && status === 'BLOCKED' &&
      <p className="text-xs text-amber-200">{t('twin.requestBlocked')}</p>}
  </article>
}
function ModelBlockers({ candidate }: { candidate: CandidateAssessment }) {
  const { t } = useT()
  return <div className="space-y-3 text-xs">
    {!!candidate.missing_parameters.length && <div>
      <p className="font-semibold text-amber-200">{t('twin.missing')}</p>
      <ul className="mt-1 space-y-1">{candidate.missing_parameters.map((path) =>
        <li key={path} className="break-all font-mono text-amber-100">{path}</li>)}</ul>
    </div>}
    {!candidate.missing_parameters.length && candidate.readiness === 'blocked' && <p>{t('twin.noMissing')}</p>}
    {!!candidate.reasons.length && <div>
      <p className="font-semibold text-amber-200">{t('twin.blockers')}</p>
      <ul className="mt-2 space-y-3">{candidate.reasons.map((reason, index) =>
        <li key={`${reason.code}-${index}`} className="space-y-1 border-l-2 border-amber-800 pl-2">
          <p className="break-all font-mono text-slate-400">{reason.code}</p>
          <p>{reason.message}</p>
          <p className="text-slate-400">{t('twin.needed')}: {reason.needed_evidence}</p>
          <p className="text-sky-200">{t('twin.next')}: {reason.next_action}</p>
        </li>)}</ul>
    </div>}
    {candidate.readiness === 'eligible' && <p className="text-emerald-200">{t('twin.noBlockers')}</p>}
  </div>
}
