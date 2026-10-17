import type { PlaybackFrame } from '../../playback/types'
import { useEffect, useRef, useState } from 'react'
import { useT } from '../../i18n'
import type { SceneDescription } from '../guidedScenario'
import { createScene, type SceneController, type SceneAction } from './createScene'

export default function SceneCanvas({ description, turned, showFlame, playback }: {
  description: SceneDescription; turned: boolean; showFlame: boolean
  playback?: { frame: PlaybackFrame; extentMm: number }
}) {
  const { t } = useT()
  const host = useRef<HTMLDivElement>(null)
  const controller = useRef<SceneController | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!host.current) return
    let cancelled = false
    try {
      controller.current = createScene(host.current, description, () => setFailed(true))
      queueMicrotask(() => { if (!cancelled) setFailed(false) })
    } catch { queueMicrotask(() => { if (!cancelled) setFailed(true) }) }
    return () => { cancelled = true; controller.current?.dispose(); controller.current = null }
  }, [description, attempt])
  useEffect(() => { controller.current?.presentation(turned, showFlame) }, [turned, showFlame, description, attempt])
  useEffect(() => {
    if (playback) controller.current?.playback(playback.frame, playback.extentMm)
  }, [playback, description, attempt])
  const buttons: [SceneAction, 'scene.reset' | 'scene.orbit' | 'scene.zoomIn' | 'scene.zoomOut'][] = [
    ['orbit', 'scene.orbit'], ['zoomIn', 'scene.zoomIn'], ['zoomOut', 'scene.zoomOut'], ['reset', 'scene.reset'],
  ]
  return <>
    <div ref={host} data-testid="scene-canvas" role="img" aria-label={t(description.mode === 'steady_playback' ? 'playback.sceneDescription' : 'scene.description')}
      className={`h-[360px] w-full sm:h-[480px] xl:h-[560px] ${failed ? 'hidden' : ''}`} />
    {failed ? <div className="min-h-80 space-y-4 p-10 text-sm text-amber-200"><p role="status">{t('scene.unavailable')}</p>
      <button type="button" className="btn" onClick={() => setAttempt(attempt + 1)}>{t('scene.retry')}</button></div> :
      <div className="flex flex-wrap gap-2 border-t border-slate-800 p-3">
        {buttons.map(([action, key]) => <button key={action} type="button" className="btn text-xs"
          onClick={() => controller.current?.action(action)}>{t(key)}</button>)}
      </div>}
  </>
}
