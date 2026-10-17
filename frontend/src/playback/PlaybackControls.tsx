import { useT } from '../i18n'
import type { usePlayback } from './usePlayback'

export function PlaybackControls({ player, duration }: { player: ReturnType<typeof usePlayback>; duration: number }) {
  const { t } = useT()
  return <div className="space-y-3 rounded-xl border border-slate-800 p-3">
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <button className="btn" data-testid="playback-play" onClick={player.toggle}>{t(player.playing ? 'playback.pause' : player.ended ? 'playback.replay' : 'playback.play')}</button>
      <button className="btn" data-testid="playback-reset" onClick={player.reset}>{t('playback.reset')}</button>
      <label className="flex items-center gap-2 text-slate-400">{t('playback.speed')}
        <select data-testid="playback-speed" className="input" value={player.rate} onChange={(event) => player.setRate(Number(event.target.value))}>
          {[.25, .5, 1, 2].map((rate) => <option value={rate} key={rate}>{rate}x</option>)}
        </select></label>
      <span className="text-slate-400">{t(player.ended ? 'playback.ended' : player.playing ? 'playback.playing' : 'playback.paused')}</span>
      <span className="ml-auto font-mono"><output data-testid="playback-time">{player.time.toFixed(2)}</output> / {duration.toFixed(2)} s</span>
    </div>
    <input data-testid="playback-timeline" aria-label={t('playback.time')} type="range" min="0" max={duration} step="any" value={player.time}
      onChange={(event) => player.seek(Number(event.target.value))} className="block w-full accent-orange-300" />
  </div>
}
