import { lazy, Suspense } from 'react'
import { useT } from '../i18n'
import { SceneBoundary } from '../scenario/ScenarioScene'
import type { SceneDescription } from '../scenario/guidedScenario'

const SceneCanvas = lazy(() => import('../scenario/scene/SceneCanvas'))
// No published quantities, images or image clock can enter this schematic.
const description: SceneDescription = { flow: 'unspecified', gravity: 'unknown', shape: 'generic' }
export function ReplaySchematic() {
  const { t } = useT()
  return <section className="min-w-0 space-y-3 rounded-xl border border-slate-800 p-4">
    <h3 className="font-semibold">{t('replay.twin')}</h3>
    <p className="text-sm text-amber-200">{t('replay.schematicOnly')}</p>
    <SceneBoundary fallback={<p role="status">{t('scene.unavailable')}</p>}>
      <Suspense fallback={<p>{t('scene.loading')}</p>}>
        <SceneCanvas description={description} turned={false} showFlame={false} />
      </Suspense>
    </SceneBoundary>
    <p className="text-xs text-slate-400">{t('replay.schematicLimit')}</p>
  </section>
}
