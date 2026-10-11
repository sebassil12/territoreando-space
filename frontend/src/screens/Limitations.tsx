import { useT, type Key } from '../i18n'
import { useGet } from '../useGet'
import { Warnings } from '../ui'

const CAN: Key[] = ['limits.can1', 'limits.can2', 'limits.can3', 'limits.can4', 'limits.can5', 'limits.can6']
const CANNOT: Key[] = ['limits.cannot1', 'limits.cannot2', 'limits.cannot3', 'limits.cannot4', 'limits.cannot5',
  'limits.cannot6', 'limits.cannot7', 'limits.cannot8']

type Source = { id: string; file: string; kind: string; available: boolean; citation?: string }
type Calibration = { calibration_id: string; calibration_file: string; reference_length_mm: string | null; calibration_status: string; notes: string }

export function Limitations() {
  const { t } = useT()
  return (
    <section className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-semibold text-emerald-300">{t('limits.can')}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">{CAN.map((k) => <li key={k}>{t(k)}</li>)}</ul>
        </div>
        <div>
          <h3 className="mb-2 font-semibold text-red-300">{t('limits.cannot')}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">{CANNOT.map((k) => <li key={k}>{t(k)}</li>)}</ul>
        </div>
      </div>
      <CalibrationStatus />
      <SourceList />
    </section>
  )
}

function CalibrationStatus() {
  const { t } = useT()
  const cals = useGet<Calibration[]>('/api/calibrations')
  const grids = [...new Map((cals.res?.data ?? []).map((c) => [c.calibration_file, c])).values()]
  return (
    <div>
      <h3 className="mb-2 font-semibold">{t('limits.calibration')}</h3>
      <ul className="space-y-1 font-mono text-xs">
        {grids.map((c) => (
          <li key={c.calibration_file}>
            {c.calibration_file.split('/').pop()} · {t('limits.reference')} {c.reference_length_mm ? t('limits.block', { mm: c.reference_length_mm }) : t('limits.unknown')} · <span className="text-amber-300">{c.calibration_status}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-slate-500">{t('limits.calNote')}</p>
    </div>
  )
}

function SourceList() {
  const { t } = useT()
  const sources = useGet<Source[]>('/api/sources')
  return (
    <div>
      <h3 className="mb-2 font-semibold">{t('limits.sources')}</h3>
      <Warnings items={sources.res?.warnings ?? []} />
      <ul className="mt-2 space-y-1 text-sm">
        {sources.res?.data.map((s) => (
          <li key={s.id}><span className="font-mono text-xs">{s.file}</span> — {s.kind} {s.available ? '' : <span className="text-amber-300">{t('limits.notFound')}</span>}</li>
        ))}
      </ul>
    </div>
  )
}
