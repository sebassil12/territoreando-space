import { Component, lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import { useLabel } from '../useLabel'
import type { ScenarioDraft } from './scenarioDraft'
import { describeScene } from './guidedScenario'

const SceneCanvas = lazy(() => import('./scene/SceneCanvas'))
export class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
export function ScenarioScene({ draft }: { draft: ScenarioDraft }) {
  const { t } = useT()
  const label = useLabel()
  const [turned, setTurned] = useState(false)
  const [showFlame, setShowFlame] = useState(true)
  const flow = draft.values['airflow.direction']
  const shape = draft.values['geometry.shape']
  const gravity = draft.values.gravity_regime
  const description = useMemo(() => describeScene({ values: { 'airflow.direction': flow, 'geometry.shape': shape, gravity_regime: gravity } }), [flow, shape, gravity])
  return <section className="overflow-hidden rounded-2xl border border-slate-700 bg-[#07101e] shadow-2xl" aria-label={t('scene.title')}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-5 py-4">
      <h3 className="text-sm font-semibold tracking-wide">{t('scene.title')}</h3>
      <span className="rounded border border-purple-700/60 bg-purple-950/40 px-2 py-1 text-[10px] tracking-widest text-purple-200">{t('scene.badge')}</span>
    </div>
    <div className="px-5 pt-3 text-xs text-slate-400">
      <p>{t('scene.gravity', { gravity: label('twin', description.gravity) })}</p>
      <p className="mt-1">{t('scene.hint')}</p>
    </div>
    <SceneBoundary fallback={<p role="status" className="p-12 text-amber-200">{t('scene.unavailable')}</p>}>
      <Suspense fallback={<p className="flex h-96 items-center justify-center text-slate-400">{t('scene.loading')}</p>}>
        <SceneCanvas description={description} turned={turned} showFlame={showFlame} />
      </Suspense>
    </SceneBoundary>
    <div className="flex flex-wrap gap-2 px-3 pb-3">
      <button type="button" className="btn text-xs" aria-pressed={turned} onClick={() => setTurned(!turned)}>{t('scene.orientation')}</button>
      <button type="button" className="btn text-xs" aria-pressed={showFlame} onClick={() => setShowFlame(!showFlame)}>{t(showFlame ? 'scene.hideFlame' : 'scene.showFlame')}</button>
    </div>
    <div className="space-y-2 border-t border-slate-800 bg-slate-900/50 px-5 py-4 text-xs" aria-label={t('scene.legend')}>
      <p className="text-purple-200">{t('scene.flame')}</p>
      <p className="text-sky-200">{t('scene.airflow')}</p>
      <p className="text-slate-200">{t('scene.reference')}</p>
      <p className="text-slate-500">{t('scene.orientationNote')} {t('scene.noData')}</p>
    </div>
  </section>
}
