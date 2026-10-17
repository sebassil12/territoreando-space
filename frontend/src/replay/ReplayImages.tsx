import { useState } from 'react'
import { type Frame, type FrameDetail, type ReplayCase, type ReplaySequence } from '../api'
import { isKey, useT } from '../i18n'
import { Warnings } from '../ui'
import { Citation } from './ReplayEvidence'
import { useReplayResource } from './useReplayResource'

export function ReplayImages({ selected }: { selected: ReplayCase }) {
  const { t } = useT()
  const [sequenceId, setSequenceId] = useState('')
  const sequence = selected.sequences.find((item) => item.sequence_id === sequenceId)
  return <section className="min-w-0 space-y-3 rounded-xl border border-slate-800 p-4">
    <h3 className="font-semibold">{t('replay.images')}</h3>
    <p className="text-xs text-slate-400">{t('replay.originals')}</p>
    {selected.image_mapping && <Citation source={selected.image_mapping} />}
    {!selected.sequences.length ? <p role="status">{t('replay.noSequences')}</p> : <label className="block text-sm">{t('replay.sequence')}
      <select className="input mt-2 w-full" data-testid="replay-sequence" value={sequenceId} onChange={(event) => setSequenceId(event.target.value)}>
        <option value="">{t('replay.chooseSequence')}</option>
        {selected.sequences.map((item) => <option key={item.sequence_id} value={item.sequence_id}>{item.sequence_id} · {item.file_type}</option>)}
      </select></label>}
    {sequence && <SequenceImages key={sequence.sequence_id} sequence={sequence} />}
  </section>
}

function SequenceImages({ sequence }: { sequence: ReplaySequence }) {
  const { t } = useT()
  const [index, setIndex] = useState(0)
  const result = useReplayResource<{ frames: Frame[] }>(`/api/sequences/${sequence.sequence_id}/frames?offset=${index}&limit=1`)
  const frame = result?.data?.data.frames[0]
  return <div className="space-y-3 text-xs">
    <p>{t('replay.coverage', { local: sequence.local_frame_count, catalog: sequence.catalog_frame_count, count: sequence.n_files })}</p>
    <p>{t('replay.sequenceQuality', { quality: sequence.temporal_quality, gaps: sequence.n_gaps_gt_2x, max: sequence.max_diff_ms / 1000, calibration: sequence.calibration_status })}</p>
    <p>{t('replay.variant', { camera: sequence.camera, variant: sequence.processing_variant })}</p>
    <p>{t('replay.independent')}</p>
    <label className="block">{t('replay.frameIndex', { index })}
      <input data-testid="replay-image-timeline" type="range" min={0} max={Math.max(0, sequence.catalog_frame_count - 1)} step={1} value={index}
        disabled={!sequence.catalog_frame_count} onChange={(event) => setIndex(Number(event.target.value))} className="mt-2 w-full" />
    </label>
    {result?.error ? <p role="alert">{t('replay.loadError')}</p> : !result ? <p>{t('common.loading')}</p>
      : frame ? <FrameObservation key={frame.frame_id} frame={frame} /> : <p role="status">{t('replay.noFrames')}</p>}
    <a href={`#Viewer/${sequence.sequence_id}`} className="text-sky-300 underline">{t('replay.openViewer')}</a>
  </div>
}

function FrameObservation({ frame }: { frame: Frame }) {
  const { t } = useT()
  const result = useReplayResource<FrameDetail>(`/api/frames/${frame.frame_id}`)
  const [imageFailed, setImageFailed] = useState(false)
  const detail = result?.data
  return <div className="space-y-3">
    <p className="break-all font-mono">{frame.relative_path}</p>
    <p>{t('replay.timestamp', { raw: frame.raw_id, time: frame.time_s.toFixed(3) })}</p>
    <p>{t('replay.frameSource', { source: frame.source_file })}</p>
    <div className="flex min-h-64 items-center justify-center rounded-lg bg-black p-3">
      {!result ? <p>{t('common.loading')}</p> : result.error ? <p role="alert">{t('replay.loadError')}</p>
        : detail?.data.image_available && detail.data.image_url && !imageFailed
          ? <img src={detail.data.image_url} alt={t('replay.imageAlt', { file: frame.file_name })} onError={() => setImageFailed(true)} className="max-h-96 w-full object-contain" />
          : <p role="status" className="text-amber-200">{t('replay.missingImage')}</p>}
    </div>
    <Warnings items={detail?.warnings ?? (frame.warning ? frame.warning.split(';') : [])} />
    {detail && <PixelMetrics metrics={detail.data.metrics} />}
  </div>
}

function PixelMetrics({ metrics }: { metrics: FrameDetail['metrics'] }) {
  const { t } = useT()
  return <div><h4 className="font-semibold">{t('replay.pixelMetrics')}</h4><p>{t('replay.pixelLimit')}</p>
    {!Object.keys(metrics).length ? <p>{t('detail.notComputed')}</p> : <dl className="mt-2 space-y-1">
      {Object.entries(metrics).map(([name, metric]) => {
        const key = `metric.${name}`
        return <div key={name} className="flex justify-between gap-2"><dt>{isKey(key) ? t(key) : name}</dt><dd>{metric.value} {metric.unit}</dd></div>
      })}</dl>}
  </div>
}
