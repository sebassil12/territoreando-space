import type { PlaybackFrame, Trajectory } from './types'

// Interpolation is explicitly between DERIVED anchors, never fabricated experimental samples.
export function sampleTrajectory(trajectory: Trajectory, time: number): PlaybackFrame {
  if (trajectory.kind !== 'steady_reference_kinematics' || !Number.isFinite(time)
      || !Number.isFinite(trajectory.duration_s) || trajectory.duration_s <= 0) {
    throw new Error('Unsupported or invalid playback trajectory.')
  }
  const time_s = Math.max(0, Math.min(time, trajectory.duration_s))
  const fraction = time_s / trajectory.duration_s
  const [start, end] = trajectory.anchors
  const x_front_mm = start.x_front_mm + fraction * (end.x_front_mm - start.x_front_mm)
  const l_p_mm = start.l_p_mm + fraction * (end.l_p_mm - start.l_p_mm)
  return { time_s, x_front_mm, l_p_mm, x_base_mm: x_front_mm - l_p_mm }
}
export function advanceTime(time: number, elapsedMs: number, duration: number, rate = 1) {
  return Math.min(duration, Math.max(0, time + Math.max(0, elapsedMs) * rate / 1000))
}
