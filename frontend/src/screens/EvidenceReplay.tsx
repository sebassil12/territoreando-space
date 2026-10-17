import { useState } from 'react'
import type { ReplayCatalog } from '../api'
import { useT } from '../i18n'
import { Warnings } from '../ui'
import { useReplayResource } from '../replay/useReplayResource'
import { ReplayImages } from '../replay/ReplayImages'
import { ReplaySchematic } from '../replay/ReplaySchematic'
import { ReplayEvidence } from '../replay/ReplayEvidence'

export function EvidenceReplay() {
  const { t } = useT()
  const result = useReplayResource<ReplayCatalog>('/api/twin/evidence-replay')
  const [caseId, setCaseId] = useState('')
  const selected = result?.data?.data.cases.find((item) => item.case_id === caseId)
  return <section className="space-y-4">
    <h2 className="text-2xl font-semibold">{t('replay.title')}</h2>
    <p className="text-sm text-slate-300">{t('replay.intro')}</p>
    <p role="status" className="text-amber-200">{t('replay.noSync')}</p>
    {result?.error ? <p role="alert">{t('replay.loadError')}</p> : !result ? <p>{t('common.loading')}</p>
      : <label className="block max-w-md text-sm">{t('playback.case')}
        <select className="input mt-2 w-full" data-testid="replay-case" value={caseId} onChange={(event) => setCaseId(event.target.value)}>
          <option value="">{t('playback.choose')}</option>
          {result.data?.data.cases.map((item) => <option key={item.case_id} value={item.case_id}>{item.label}</option>)}
        </select></label>}
    {result?.data && !result.data.data.cases.length && <p>{t('playback.noCases')}</p>}
    {selected && <div key={selected.case_id} className="space-y-4">
      <p className="text-sm">{t('replay.quality')} · {selected.quality}</p>
      <div className="grid items-start gap-4 xl:grid-cols-2"><ReplayImages selected={selected} /><ReplaySchematic /></div>
      <ReplayEvidence selected={selected} /><Warnings items={selected.warnings} />
    </div>}
  </section>
}
