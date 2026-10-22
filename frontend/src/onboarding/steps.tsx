import type { Finding, FrameDetail, Frame, SampleConditions, Sequence } from '../api'
import { useT, type Key } from '../i18n'
import { useGet } from '../useGet'
import { EXPLORE_CARDS, LEARNED_FINDINGS, STEP_TEXT, type StepId } from './content'
import { RefLine } from './RefLine'

const THUMB_SEQUENCE = 'S1-C2-raw-jpeg-part1'

// Plain paragraphs, each followed by its citation or general-knowledge tag.
export function TextStep({ step }: { step: StepId }) {
  const { t } = useT()
  return (
    <ul className="space-y-3">
      {(STEP_TEXT[step] ?? []).map(([suffix, source]) => (
        <li key={suffix} className="rounded-md border-l-2 border-orange-600 bg-slate-900/40 px-3 py-2">
          <p>{t(`onb.${step}.${suffix}` as Key)}</p>
          <p className="mt-1"><RefLine source={source} /></p>
        </li>
      ))}
    </ul>
  )
}

export function UnknownsStep() {
  const { t } = useT()
  return (
    <div className="space-y-3">
      <TextStep step="unknowns" />
      <a className="text-sky-300 underline" href="#Limitations">{t('onb.unknowns.more')}</a>
    </div>
  )
}

export function LearnedStep() {
  const { t } = useT()
  const findings = useGet<Finding[]>('/api/findings').res?.data
  return (
    <div className="space-y-3">
      <p className="text-slate-300">{t('onb.learned.intro')}</p>
      <ul className="space-y-3">
        {LEARNED_FINDINGS.map((id) => (
          <li key={id} className="rounded-md border-l-2 border-emerald-600 bg-slate-900/40 px-3 py-2">
            <p>{t(`onb.learned.${id}` as Key)}</p>
            <p className="mt-1"><LearnedRef id={id} finding={findings?.find((f) => f.finding_id === id)} /></p>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Learned citations come from the loaded findings; until they load, the finding ID alone stays linked.
function LearnedRef({ id, finding: f }: { id: string; finding?: Finding }) {
  if (!f) return <a className="font-mono text-xs text-sky-300 underline" href={`#Findings/${id}`}>{id}</a>
  return <RefLine source={{ findingId: id, file: f.source_path.split('/').pop() ?? f.source_path, location: f.source_location }} />
}

export function DataStep() {
  const { t } = useT()
  const findings = useGet<Finding[]>('/api/findings').res?.data.length
  const sequences = useGet<Sequence[]>('/api/sequences').res?.data.length
  const samples = useGet<SampleConditions[]>('/api/conditions').res?.data.filter((c) => c.material).length
  const stats: [number | undefined, Key][] = [[findings, 'onb.data.findings'], [sequences, 'onb.data.sequences'], [samples, 'onb.data.samples']]
  return (
    <div className="space-y-4">
      <p className="text-slate-300">{t('onb.data.intro')}</p>
      <dl className="grid grid-cols-3 gap-3">
        {stats.map(([n, label]) => (
          <div key={label} className="rounded-lg border border-slate-700 p-3 text-center">
            <dt className="text-xs text-slate-400">{t(label)}</dt>
            <dd className="text-2xl font-bold text-orange-300">{n ?? '…'}</dd>
          </div>
        ))}
      </dl>
      <FrameThumbnail />
      <p className="text-sm"><span className="text-slate-300">{t('onb.data.coverage')}</span>{' '}
        <RefLine source={{ findingId: 'F-data-002', file: 'SAFFIRE-II_MergeResult-jpeg_v5_Final.xlsx', location: "hoja 'Received - jpeg'" }} /></p>
    </div>
  )
}

// One real NASA frame through the existing frame endpoints; degrades to a note when raw images are absent.
function FrameThumbnail() {
  const { t } = useT()
  const list = useGet<{ frames: Frame[] }>(`/api/sequences/${THUMB_SEQUENCE}/frames?limit=1`)
  const first = list.res?.data.frames[0]
  const detail = useGet<FrameDetail>(first ? `/api/frames/${encodeURIComponent(first.frame_id)}` : null)
  const frame = detail.res?.data
  if (list.error || detail.error || (frame && !frame.image_url)) return <p className="text-sm text-slate-400">{t('onb.data.noImage')}</p>
  if (!frame?.image_url) return null
  return (
    <figure className="space-y-1">
      <a href={`#Viewer/${THUMB_SEQUENCE}`}><img src={frame.image_url} alt={t('viewer.frameAlt', { i: 1, id: THUMB_SEQUENCE })} className="max-h-64 rounded border border-slate-700" /></a>
      <figcaption className="text-xs text-slate-400">{t('onb.data.frameCaption', { id: THUMB_SEQUENCE, t: frame.time_s })}</figcaption>
    </figure>
  )
}

export function ExploreStep() {
  const { t } = useT()
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {EXPLORE_CARDS.map((c) => (
        <li key={c.id}>
          <a href={`#${c.route}`} className="block h-full rounded-lg border border-slate-700 bg-slate-900/40 p-4 hover:border-orange-500 focus-visible:outline-2 focus-visible:outline-orange-400">
            <span className="font-semibold text-orange-300">{t(`tab.${c.route}` as Key)}</span>
            <p className="mt-1 text-sm text-slate-300">{t(`onb.explore.${c.id}` as Key)}</p>
          </a>
        </li>
      ))}
    </ul>
  )
}
