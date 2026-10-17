import { lazy, Suspense, useMemo } from 'react'
import { useT } from '../i18n'
import { SceneBoundary } from '../scenario/ScenarioScene'
import type { SceneDescription } from '../scenario/guidedScenario'
import type { PlaybackFrame, PlaybackCase } from './types'

const SceneCanvas = lazy(() => import('../scenario/scene/SceneCanvas'))
export function PlaybackScene({ frame, extentMm, selected }: { frame: PlaybackFrame; extentMm: number; selected: PlaybackCase }) {
  const { t } = useT()
  const flow = selected.airflow?.direction ?? 'unspecified'
  const description: SceneDescription = useMemo(() => ({ mode: 'steady_playback', flow, gravity: 'microgravity', shape: 'generic' }), [flow])
  return <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#07101e]">
    <div className="pointer-events-none absolute left-4 top-4 z-10 text-xs text-slate-300">
      <p className="font-semibold tracking-wider text-orange-200">{t('playback.microgravity')}</p>
      <p className="mt-1 text-slate-400">{t('playback.appearanceBadge')}</p>
    </div>
    <SceneBoundary fallback={<p className="p-8 text-amber-200">{t('scene.unavailable')}</p>}>
      <Suspense fallback={<p className="h-80 p-8">{t('scene.loading')}</p>}>
        <SceneCanvas description={description} turned={false} showFlame playback={{ frame, extentMm }} />
      </Suspense>
    </SceneBoundary>
  </section>
}
