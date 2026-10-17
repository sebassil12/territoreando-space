import { useT } from '../i18n'
import type { ReplayCase, ReplayCitation } from '../api'

export function Citation({ source }: { source: ReplayCitation }) {
  const { t } = useT()
  if (!source.file || !source.page) return <span>{t('replay.noCitation')}</span>
  return <span className="break-words text-xs text-sky-300">{source.url
    ? <a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.file} · p.{source.page}</a>
    : <span>{source.file} · p.{source.page}</span>} {source.location}</span>
}

export function ReplayEvidence({ selected }: { selected: ReplayCase }) {
  const { t } = useT()
  return <section className="space-y-3 rounded-xl border border-slate-700 p-4 text-sm">
    <h3 className="font-semibold">{t('replay.evidence')}</h3>
    <p className="text-amber-200">{t('replay.unverified')}</p>
    <dl className="grid gap-3 sm:grid-cols-2">{Object.entries(selected.reference_evidence).map(([name, item]) => <div key={name}>
      <dt>{name === 'vf' ? 'Vf' : 'l_p'} · {t('replay.published')}</dt>
      <dd>{item.value} {item.unit} · <Citation source={item} /></dd>
      <dd className="text-xs text-slate-400">{item.notes}</dd>
    </div>)}</dl>
    <p>{selected.reference_audit.notes} <Citation source={selected.reference_audit} /></p>
    <p>{t('replay.geometry')}: {selected.geometry ? <>{selected.geometry.dimensions} · <Citation source={selected.geometry} /></> : t('replay.noGeometry')}</p>
    <p className="text-slate-400">{t('replay.geometryLimit')}</p>
    <div className="grid gap-3 md:grid-cols-3">
      <p>{t('replay.observations')}</p><p>{t('replay.derived')}</p><p>{t('replay.visual')}</p>
    </div>
    <p className="text-amber-200">{t('replay.errorUnavailable')}</p>
  </section>
}
