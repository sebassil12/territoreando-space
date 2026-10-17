import { useEffect, useState } from 'react'
import { loadPlaybackCases, type Envelope } from '../api'
import type { PlaybackCatalog } from '../playback/types'
import { PlaybackPanel } from '../playback/PlaybackPanel'
import { useT } from '../i18n'

export function SaffirePlayback() {
  const { t } = useT()
  const [catalog, setCatalog] = useState<Envelope<PlaybackCatalog> | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    loadPlaybackCases(controller.signal).then((response) => { if (!controller.signal.aborted) setCatalog(response) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [])
  const selected = catalog?.data.cases.find((item) => item.case_id === selectedId)
  const extentMm = Math.max(0, ...(catalog?.data.cases.map((item) => item.trajectory?.display_extent_mm ?? 0) ?? []))
  return <section className="space-y-4">
    <h2 className="text-2xl font-semibold">{t('playback.title')}</h2>{!selected && <p className="text-sm text-slate-400">{t('playback.intro')}</p>}
    <p className="text-xs text-slate-400">{t('playback.boundary')}</p>
    {error && <p role="alert">{t('playback.error')}</p>}
    {!catalog && !error && <p>{t('common.loading')}</p>}
    {catalog && <label className="block max-w-md text-sm">{t('playback.case')}
      <select data-testid="playback-case" className="input mt-2 w-full" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
        <option value="">{t('playback.choose')}</option>
        {catalog.data.cases.map((item) => <option key={item.case_id} value={item.case_id}>{item.label}{item.status === 'unavailable' ? ' · BLOCKED' : ''}</option>)}
      </select></label>}
    {catalog && !catalog.data.cases.length && <p>{t('playback.noCases')}</p>}
    {selected ? <PlaybackPanel key={selected.case_id} selected={selected} extentMm={extentMm} /> : <p className="text-sm text-slate-400">{t('playback.noSelection')}</p>}
  </section>
}
