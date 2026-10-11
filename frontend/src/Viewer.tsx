import { useEffect, useMemo, useRef, useState } from 'react'
import { get, type Envelope, type Frame, type FrameDetail, type Metrics, type Sequence } from './api'
import { isKey, useT } from './i18n'
import { Warnings, QualityBadge } from './ui'

const METRICS = ['mean_intensity', 'bright_pixel_fraction', 'bright_area_pixels', 'centroid_x', 'centroid_y',
  'bbox_width_pixels', 'bbox_height_pixels'] as const

function useMetricLabel() {
  const { t } = useT()
  return (name: string) => { const k = `metric.${name}`; return isKey(k) ? t(k) : name }
}

export function Viewer({ sequenceId }: { sequenceId: string }) {
  const { t } = useT()
  const [seq, setSeq] = useState<Envelope<Sequence> | null>(null)
  const [frames, setFrames] = useState<Frame[]>([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [step, setStep] = useState(1)
  const [detail, setDetail] = useState<Envelope<FrameDetail> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    get<Sequence>(`/api/sequences/${sequenceId}`).then(setSeq).catch((e) => setError(String(e)))
    get<{ frames: Frame[] }>(`/api/sequences/${sequenceId}/frames?limit=10000`)
      .then((r) => setFrames(r.data.frames))
      .catch((e) => setError(String(e)))
  }, [sequenceId])

  useEffect(() => {
    if (!playing || !frames.length) return
    const t = setInterval(() => setIndex((i) => (i + step < frames.length ? i + step : 0)), 100)
    return () => clearInterval(t)
  }, [playing, step, frames.length])

  const frame = frames[index]
  useEffect(() => {
    if (!frame || playing) return
    get<FrameDetail>(`/api/frames/${frame.frame_id}`).then(setDetail).catch(() => setDetail(null))
  }, [frame, playing])

  if (error) return <p className="text-red-300">{t('viewer.loadError', { error })}</p>
  if (!seq || !frames.length) return <p className="text-slate-400">{t('viewer.loading')}</p>
  const s = seq.data

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-xl font-semibold">{s.sequence_id}</h2>
        <QualityBadge quality={s.temporal_quality} />
        <span className="text-sm text-slate-400">
          {t('viewer.summary', { type: s.file_type, n: s.n_files, d: s.duration_s, role: s.sequence_role })}
        </span>
      </header>
      <Warnings items={seq.warnings} />

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <div className="flex min-h-48 items-center justify-center rounded-lg bg-black p-2">
            {frame.availability === 'available' ? (
              <img src={`/api/frames/${frame.frame_id}/image`} alt={t('viewer.frameAlt', { i: frame.frame_index, id: s.sequence_id })}
                className="max-h-[60vh] w-full object-contain [image-rendering:pixelated]" />
            ) : (
              <p className="text-amber-300">{t('viewer.noImage', { availability: frame.availability, path: frame.relative_path })}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn" onClick={() => setIndex((i) => Math.max(0, i - step))} aria-label={t('viewer.prevLabel')}>{t('viewer.prev')}</button>
            <button className="btn" onClick={() => setPlaying((p) => !p)}>{playing ? t('viewer.pause') : t('viewer.play')}</button>
            <button className="btn" onClick={() => setIndex((i) => Math.min(frames.length - 1, i + step))} aria-label={t('viewer.nextLabel')}>{t('viewer.next')}</button>
            <label className="ml-2 text-sm text-slate-300">
              {t('viewer.samplingPre')}
              <select className="input ml-1" value={step} onChange={(e) => setStep(Number(e.target.value))}>
                {[1, 2, 5, 10, 30].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              {' '}{t('viewer.samplingPost')}
            </label>
          </div>
          <input type="range" min={0} max={frames.length - 1} value={index} aria-label={t('viewer.position')}
            onChange={(e) => { setPlaying(false); setIndex(Number(e.target.value)) }} className="w-full accent-orange-500" />
          <Provenance s={s} f={frame} />
        </div>
        <FrameDetailPanel detail={detail} />
      </section>

      <Analysis key={s.sequence_id} sequence={s} currentTime={frame.time_s} onSeek={(t) => {
        const i = frames.findIndex((f) => f.time_s >= t)
        setPlaying(false)
        if (i >= 0) setIndex(i)
      }} />
    </div>
  )
}

function Provenance({ s, f }: { s: Sequence; f: Frame }) {
  const { t } = useT()
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-slate-800 p-3 font-mono text-xs sm:grid-cols-3">
      <Item k={t('science.source')} v={t('prov.sourceValue')} />
      <Item k={t('prov.sequence')} v={s.sequence_id} />
      <Item k={t('prov.frame')} v={`${f.frame_index} / ${s.n_files - 1}`} />
      <Item k={t('prov.rawId')} v={String(f.raw_id)} />
      <Item k={t('prov.time')} v={t('prov.timeValue', { t: f.time_s.toFixed(3) })} />
      <Item k={t('prov.quality')} v={s.temporal_quality} />
    </dl>
  )
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-slate-500">{k}</dt>
      <dd className="break-all text-slate-200">{v}</dd>
    </div>
  )
}

function FrameDetailPanel({ detail }: { detail: Envelope<FrameDetail> | null }) {
  const { t } = useT()
  const label = useMetricLabel()
  if (!detail) return <aside className="text-sm text-slate-500">{t('detail.pause')}</aside>
  const d = detail.data
  return (
    <aside className="space-y-3 rounded-lg border border-slate-800 p-4 text-sm">
      <h3 className="font-semibold">{t('detail.title')}</h3>
      <dl className="space-y-1 font-mono text-xs">
        <Item k="frame_id" v={d.frame_id} />
        <Item k={t('detail.path')} v={d.relative_path} />
        <Item k={t('detail.sourceFile')} v={d.source_file} />
        <Item k={t('detail.availability')} v={d.availability} />
      </dl>
      <Warnings items={detail.warnings} empty={t('detail.noWarnings')} />
      <div>
        <h4 className="mb-1 font-medium">{t('detail.metrics')} <span className="text-xs text-slate-500">{t('detail.metricsNote')}</span></h4>
        {Object.keys(d.metrics).length ? (
          <table className="w-full text-xs">
            <tbody>
              {Object.entries(d.metrics).map(([k, m]) => (
                <tr key={k} className="border-t border-slate-800">
                  <td className="py-1 text-slate-400">{label(k)}</td>
                  <td className="py-1 text-right tabular-nums">{m.value} {m.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-slate-500">{t('detail.notComputed')}</p>
        )}
      </div>
    </aside>
  )
}

function Analysis({ sequence, currentTime, onSeek }: { sequence: Sequence; currentTime: number; onSeek: (t: number) => void }) {
  const [m, setM] = useState<Envelope<Metrics> | null>(null)
  const [metric, setMetric] = useState('mean_intensity')
  const { t } = useT()
  const label = useMetricLabel()
  useEffect(() => {
    get<Metrics>(`/api/metrics/${sequence.sequence_id}`).then(setM).catch(() => setM(null))
  }, [sequence.sequence_id])

  if (!m) return <p className="text-slate-500">{t('analysis.loading')}</p>
  const points = m.data.points.filter((p) => typeof p[metric] === 'number')
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold">{t('analysis.title')}</h3>
        <select className="input" value={metric} onChange={(e) => setMetric(e.target.value)} aria-label={t('analysis.metric')}>
          {METRICS.map((k) => <option key={k} value={k}>{label(k)}</option>)}
        </select>
        <span className="rounded bg-sky-900/60 px-2 py-0.5 text-xs text-sky-200">{t('analysis.badge')}</span>
      </div>
      <Warnings items={m.warnings} />
      {points.length ? (
        <LineChart points={points} metric={metric} unit={m.data.units[metric] ?? ''} label={label(metric)} duration={sequence.duration_s}
          currentTime={currentTime} onSeek={onSeek} />
      ) : (
        <p className="text-sm text-slate-500">{t('analysis.noValues')}</p>
      )}
      <p className="text-xs text-slate-500">{t('analysis.method', { method: m.data.method ?? '—', source: m.source })}</p>
    </section>
  )
}

const W = 800, H = 240, PAD = { l: 56, r: 28, t: 12, b: 32 }

function LineChart({ points, metric, unit, label, duration, currentTime, onSeek }: {
  points: Record<string, number | string>[]; metric: string; unit: string; label: string; duration: number
  currentTime: number; onSeek: (t: number) => void
}) {
  const { t } = useT()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<Record<string, number | string> | null>(null)
  const { xs, ys, x, y, yTicks, xTicks } = useMemo(() => {
    const xs = points.map((p) => Number(p.time_s)), ys = points.map((p) => Number(p[metric]))
    const x0 = 0, x1 = Math.max(duration, ...xs) || 1
    const y0 = Math.min(0, ...ys), y1 = Math.max(...ys) || 1
    const x = (v: number) => PAD.l + ((v - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r)
    const y = (v: number) => H - PAD.b - ((v - y0) / (y1 - y0 || 1)) * (H - PAD.t - PAD.b)
    const ticks = (a: number, b: number) => [0, 0.25, 0.5, 0.75, 1].map((f) => a + f * (b - a))
    return { xs, ys, x, y, yTicks: ticks(y0, y1), xTicks: ticks(x0, x1) }
  }, [points, metric, duration])

  // Nunca dibujar una línea a través de un hueco temporal: iniciar un segmento nuevo cuando el espaciado salta.
  const dts = xs.slice(1).map((v, i) => v - xs[i]).sort((a, b) => a - b)
  const gapAt = 3 * (dts[Math.floor(dts.length / 2)] ?? Infinity)
  const path = xs.map((v, i) => `${i && v - xs[i - 1] <= gapAt ? 'L' : 'M'}${x(v).toFixed(1)},${y(ys[i]).toFixed(1)}`).join('')
  const joined = (i: number) => i > 0 && i < xs.length && xs[i] - xs[i - 1] <= gapAt
  const isolated = xs.map((_, i) => i).filter((i) => !joined(i) && !joined(i + 1))
  const nearest = (clientX: number) => {
    const r = svgRef.current!.getBoundingClientRect()
    const px = ((clientX - r.left) / r.width) * W
    let best = 0
    xs.forEach((v, i) => { if (Math.abs(x(v) - px) < Math.abs(x(xs[best]) - px)) best = i })
    return points[best]
  }
  const fmt = (v: number) => (Math.abs(v) < 1 && v !== 0 ? v.toFixed(3) : Math.round(v).toString())

  return (
    <figure className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair rounded-lg bg-[#1a1a19]"
        role="img" aria-label={t('chart.aria', { label, unit })}
        onMouseMove={(e) => setHover(nearest(e.clientX))} onMouseLeave={() => setHover(null)}
        onClick={(e) => onSeek(Number(nearest(e.clientX).time_s))}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#383835" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#c3c2b7">{fmt(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} x={x(t)} y={H - 10} textAnchor="middle" fontSize={11} fill="#c3c2b7">{t.toFixed(0)} s</text>
        ))}
        <path d={path} fill="none" stroke="#3987e5" strokeWidth={2} strokeLinejoin="round" />
        {isolated.map((i) => <circle key={i} cx={x(xs[i])} cy={y(ys[i])} r={4} fill="#3987e5" />)}
        <line x1={x(currentTime)} x2={x(currentTime)} y1={PAD.t} y2={H - PAD.b} stroke="#eb6834" strokeWidth={1.5} strokeDasharray="4 3" />
        {hover && (
          <g pointerEvents="none">
            <line x1={x(Number(hover.time_s))} x2={x(Number(hover.time_s))} y1={PAD.t} y2={H - PAD.b} stroke="#c3c2b7" strokeWidth={1} />
            <circle cx={x(Number(hover.time_s))} cy={y(Number(hover[metric]))} r={4} fill="#3987e5" stroke="#1a1a19" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute top-2 right-2 rounded border border-slate-700 bg-slate-900/95 px-2 py-1 font-mono text-xs">
          t = {Number(hover.time_s).toFixed(3)} s · {label}: {String(hover[metric])} {unit}
        </div>
      )}
      <figcaption className="mt-1 text-xs text-slate-400">
        {t('chart.caption', { label, unit })}
      </figcaption>
    </figure>
  )
}
