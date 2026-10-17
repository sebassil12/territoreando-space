import { useEffect, useState } from 'react'
import { advanceTime } from './kinematics'

export function usePlayback(duration: number) {
  const [rate, setRate] = useState(1)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    let request = 0
    const tick = (now: number) => {
      const elapsed = now - last; last = now
      setTime((current) => advanceTime(current, elapsed, duration, rate))
      request = requestAnimationFrame(tick)
    }
    const visibility = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener('visibilitychange', visibility)
    request = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(request); document.removeEventListener('visibilitychange', visibility) }
  }, [playing, duration, rate])
  // End is derived; the animation effect stops when the public play state becomes false.
  const ended = time >= duration
  useEffect(() => { if (ended && playing) queueMicrotask(() => setPlaying(false)) }, [ended, playing])
  return {
    time, rate, setRate, playing: playing && !ended, ended,
    toggle: () => { if (ended) setTime(0); setPlaying((value) => !value) },
    seek: (value: number) => { setPlaying(false); setTime(Math.max(0, Math.min(duration, value))) },
    reset: () => { setPlaying(false); setTime(0) },
  }
}
