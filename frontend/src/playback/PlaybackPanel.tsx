import { useT } from '../i18n'
import type { PlaybackCase, PlaybackFrame, Trajectory } from './types'
import { sampleTrajectory } from './kinematics'
import { usePlayback } from './usePlayback'
import { PlaybackScene } from './PlaybackScene'
import { PlaybackControls } from './PlaybackControls'
import { Warnings } from '../ui'

export function PlaybackPanel({ selected, extentMm }: { selected: PlaybackCase; extentMm: number }) {
  const { t } = useT()
  if (selected.status !== 'available' || !selected.trajectory) return <div role="status" className="text-amber-200">
    <p>{t('playback.unavailable')}</p><ul>{selected.missing_requirements.map((item) => <li key={item}>{item}</li>)}</ul>
  </div>
  return <AvailablePlayback selected={selected} trajectory={selected.trajectory} extentMm={extentMm} />
}
function AvailablePlayback({ selected, trajectory, extentMm }: { selected: PlaybackCase; trajectory: Trajectory; extentMm: number }) {
  const player = usePlayback(trajectory.duration_s)
  const frame = sampleTrajectory(trajectory, player.time)
  return <div className="space-y-3">
    <PlaybackSummary selected={selected} />
    <PlaybackScene frame={frame} extentMm={extentMm} selected={selected} />
    <PlaybackControls player={player} duration={trajectory.duration_s} />
    <PlaybackDetails selected={selected} frame={frame} extentMm={extentMm} />
  </div>
}
function PlaybackSummary({ selected }: { selected: PlaybackCase }) {
  const { t } = useT()
  const { vf, lp } = selected.evidence
  return <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300">
    <span>Vf <strong className="font-mono text-slate-100">{vf?.value} {vf?.unit}</strong></span>
    <span>l_p <strong className="font-mono text-slate-100">{lp?.value} {lp?.unit}</strong></span>
    <span>{t('playback.airflow')}: {selected.airflow?.condition ?? t('playback.unknownFlow')} · {t('playback.concurrent')}</span>
    <a href={vf?.url ?? undefined} target="_blank" rel="noreferrer" className="text-sky-300 underline">SAFFIRE · {vf?.file} · p.{vf?.page}</a>
  </div>
}
function PlaybackDetails({ selected, frame, extentMm }: { selected: PlaybackCase; frame: PlaybackFrame; extentMm: number }) {
  const { t } = useT()
  return <details className="rounded-xl border border-slate-800 p-4"><summary className="cursor-pointer text-sm">{t('playback.details')}</summary>
    <div className="mt-4 space-y-4 text-xs text-slate-400">
      <p className="text-amber-200">{t('playback.review')}</p>
      <p>{t('playback.quality')}: {selected.quality}</p>
      <p>{t('playback.physicsDriven')}</p><p>{t('playback.visualInspired')}</p>
      <p>{t('playback.timeNote')}</p><p>{t('playback.coordinate')}</p><p>{t('playback.scale', { extent: extentMm })}</p>
      <div className="flex flex-wrap gap-5">{([['front', frame.x_front_mm], ['length', frame.l_p_mm], ['base', frame.x_base_mm]] as const).map(([key, value]) =>
        <p key={key}>{t(`playback.${key}`)}: <span data-testid={`playback-${key}`}>{value.toFixed(2)} mm</span></p>)}</div>
      <Warnings items={selected.warnings} />
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(selected, null, 2)}</pre>
    </div>
  </details>
}
