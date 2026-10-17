import { useState } from 'react'
import { useT } from '../i18n'
import { ScenarioBuilder } from './ScenarioBuilder'
import { SaffirePlayback } from './SaffirePlayback'
import { EvidenceReplay } from './EvidenceReplay'

export function Twin() {
  const { t } = useT()
  const [mode, setMode] = useState<'playback' | 'model' | 'replay'>('playback')
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('tab.Twin')}>
      <button className="btn" data-testid="twin-replay-mode" aria-pressed={mode === 'replay'} onClick={() => setMode('replay')}>{t('replay.title')}</button>
      <button className="btn" data-testid="twin-playback-mode" aria-pressed={mode === 'playback'} onClick={() => setMode('playback')}>{t('playback.mode')}</button>
      <button className="btn" data-testid="twin-model-mode" aria-pressed={mode === 'model'} onClick={() => setMode('model')}>{t('playback.modelMode')}</button>
    </div>
    {mode === 'replay' ? <EvidenceReplay /> : mode === 'playback' ? <SaffirePlayback /> : <ScenarioBuilder />}
  </div>
}
