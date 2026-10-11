import { useEffect, useMemo, useState } from 'react'
import { ask, get, type Answer, type Envelope, type References, type Sequence } from './api'
import { useT, type Key, type Lang } from './i18n'
import { QualityBadge, Warnings } from './ui'
import { Viewer } from './Viewer'

// Las claves internas de pestaña se usan en los enlaces por hash (#Viewer/<sequence_id>); solo se traduce la etiqueta.
const TABS = ['Overview', 'Sequences', 'Viewer', 'Scientific context', 'Assistant', 'Sources & limitations'] as const
type Tab = (typeof TABS)[number]

export default function App() {
  const { t, lang, setLang } = useT()
  // Enlace directo para demos: #Viewer/S1-C2-raw-jpeg-part1
  const [hashTab, hashSeq] = decodeURIComponent(location.hash.slice(1)).split('/')
  const [tab, setTab] = useState<Tab>(TABS.includes(hashTab as Tab) ? (hashTab as Tab) : 'Overview')
  const [sequenceId, setSequenceId] = useState(hashSeq || 'S1-C2-raw-jpeg-part1')
  const open = (id: string) => { setSequenceId(id); setTab('Viewer') }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-6 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">Flame in Freefall <span className="font-normal text-slate-400">{t('app.subtitle')}</span></h1>
          <div className="flex gap-1 text-xs" role="group" aria-label={t('app.language')}>
            {(['es', 'en'] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                className={`rounded px-2 py-1 uppercase ${lang === l ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label={t('app.views')}>
          {TABS.map((k) => (
            <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}
              className={`rounded-md px-3 py-1.5 text-sm ${tab === k ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
              {t(`tab.${k}`)}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {tab === 'Overview' && <Overview onOpen={open} />}
        {tab === 'Sequences' && <Catalog onOpen={open} />}
        {tab === 'Viewer' && <Viewer key={sequenceId} sequenceId={sequenceId} />}
        {tab === 'Scientific context' && <Science />}
        {tab === 'Assistant' && <Assistant sequenceId={sequenceId} />}
        {tab === 'Sources & limitations' && <Limitations />}
      </main>
    </div>
  )
}

function useGet<T>(path: string) {
  const [res, setRes] = useState<Envelope<T> | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { get<T>(path).then(setRes).catch((e) => setError(String(e))) }, [path])
  return { res, error }
}

function Cite({ children }: { children: React.ReactNode }) {
  return <sup className="ml-0.5 text-xs text-sky-300">[{children}]</sup>
}

function Overview({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useT()
  return (
    <article className="max-w-3xl space-y-4 leading-relaxed">
      <p>{t('overview.p1')}<Cite>urban2019, p.168–169</Cite></p>
      <p>
        {t('overview.p2a')}<Cite>urban2019, p.173</Cite>{t('overview.p2b')}<Cite>urban2019, p.173</Cite>
      </p>
      <p>{t('overview.p3')}</p>
      <div className="rounded-lg border border-slate-700 p-4 text-sm">
        <h2 className="mb-2 font-semibold">{t('overview.scope')}</h2>
        <ul className="list-disc space-y-1 pl-5 text-slate-300">
          <li>{t('overview.scope1')}</li>
          <li>{t('overview.scope2')}</li>
          <li>{t('overview.scope3')}</li>
        </ul>
      </div>
      <button className="btn" onClick={() => onOpen('S1-C2-raw-jpeg-part1')}>{t('overview.start')}</button>
    </article>
  )
}

const FILTERS = ['group', 'camera', 'file_type', 'processing_variant', 'temporal_quality'] as const
const COLUMNS: Key[] = ['catalog.sequence', 'catalog.group', 'catalog.channel', 'catalog.type', 'catalog.role', 'catalog.frames',
  'catalog.duration', 'catalog.medianDt', 'catalog.gaps', 'catalog.quality', 'catalog.calibration']

function Catalog({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useT()
  const { res, error } = useGet<Sequence[]>('/api/sequences')
  const [filter, setFilter] = useState<Record<string, string>>({})
  const all = useMemo(() => res?.data ?? [], [res])
  const rows = all.filter((s) => FILTERS.every((k) => !filter[k] || s[k] === filter[k]))
  const options = useMemo(() => Object.fromEntries(FILTERS.map((k) => [k, [...new Set(all.map((s) => s[k]))].sort()])), [all])

  if (error) return <p className="text-red-300">{error}</p>
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {FILTERS.map((k) => (
          <label key={k} className="text-sm text-slate-300">
            {t(`filter.${k}`)}
            <select className="input ml-1" value={filter[k] ?? ''} onChange={(e) => setFilter({ ...filter, [k]: e.target.value })}>
              <option value="">{t('catalog.all')}</option>
              {options[k]?.map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-400">
            <tr>{COLUMNS.map((h) => <th key={h} className="px-2 py-2 font-medium">{t(h)}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.sequence_id} className="cursor-pointer border-t border-slate-800 hover:bg-slate-900" onClick={() => onOpen(s.sequence_id)}>
                <td className="px-2 py-1.5 font-mono text-xs text-sky-300 underline">{s.sequence_id}</td>
                <td className="px-2">{s.group}</td>
                <td className="px-2">{s.camera}</td>
                <td className="px-2">{s.file_type}</td>
                <td className="px-2 text-xs">{s.sequence_role.replace(/_/g, ' ')}{s.primary_sequence_id && <div className="text-slate-500">{t('catalog.of', { id: s.primary_sequence_id })}</div>}</td>
                <td className="px-2 text-right tabular-nums">{s.n_files}</td>
                <td className="px-2 text-right tabular-nums">{s.duration_s.toFixed(1)} s</td>
                <td className="px-2 text-right tabular-nums">{s.median_diff_ms} ms</td>
                <td className="px-2 text-right tabular-nums">{s.n_gaps_gt_2x}</td>
                <td className="px-2"><QualityBadge quality={s.temporal_quality} /></td>
                <td className="px-2 text-xs">{s.calibration_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">{t('catalog.note', { source: res?.source ?? '' })}</p>
    </section>
  )
}

const SCIENCE_COLUMNS: Key[] = ['science.experiment', 'science.material', 'science.conditions', 'science.result', 'science.value', 'science.source']

function Science() {
  const { t } = useT()
  const { res, error } = useGet<References>('/api/references')
  if (error) return <p className="text-red-300">{error}</p>
  if (!res) return <p className="text-slate-400">{t('common.loading')}</p>
  const src = res.data.sources.urban2019
  return (
    <section className="space-y-5">
      <Warnings items={res.warnings} />
      <p className="text-sm text-slate-400">{src?.citation} DOI {src?.doi}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-400">
            <tr><th className="px-2 py-2 font-medium" />{SCIENCE_COLUMNS.map((h) => <th key={h} className="px-2 py-2 font-medium">{t(h)}</th>)}</tr>
          </thead>
          <tbody>
            {res.data.results.map((r) => (
              <tr key={r.id} className="border-t border-slate-800 align-top">
                <td className="px-2 py-2"><span className="whitespace-nowrap rounded bg-violet-900/60 px-2 py-0.5 text-xs text-violet-200">{t('science.published')}</span></td>
                <td className="px-2 py-2">{r.experiment}</td>
                <td className="px-2 py-2">{r.material}<div className="text-xs text-slate-500">{r.dimensions}</div></td>
                <td className="px-2 py-2 text-xs">{[r.oxygen, r.flow, r.pressure].filter(Boolean).join(' · ') || '—'}</td>
                <td className="px-2 py-2">{r.published_result}<div className="text-xs text-slate-500">{r.notes}</div></td>
                <td className="px-2 py-2 whitespace-nowrap tabular-nums">{r.value ?? '—'} {r.unit}</td>
                <td className="px-2 py-2 text-xs whitespace-nowrap">{r.source}, p.{r.page}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="font-semibold">{t('science.findings')}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {res.data.facts.map((f) => <li key={f.id}>{f.text}<Cite>{f.source}, p.{f.page}</Cite></li>)}
      </ul>
      <p className="text-xs text-slate-500">{t('science.compare')}</p>
    </section>
  )
}

const SUGGESTIONS: Key[] = ['assistant.s1', 'assistant.s2', 'assistant.s3', 'assistant.s4', 'assistant.s5']

function Assistant({ sequenceId }: { sequenceId: string }) {
  const { t } = useT()
  const [q, setQ] = useState('')
  const [a, setA] = useState<Envelope<Answer> | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (question: string) => {
    setQ(question); setBusy(true)
    try { setA(await ask(question, sequenceId)) } finally { setBusy(false) }
  }
  return (
    <section className="max-w-3xl space-y-4">
      <p className="text-sm text-slate-400">
        {t('assistant.intro')} {t('assistant.context')} <span className="font-mono">{sequenceId}</span>
      </p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) submit(q) }}>
        <input className="input flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('assistant.placeholder')} aria-label={t('assistant.question')} />
        <button className="btn" disabled={busy}>{t('assistant.ask')}</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((k) => <button key={k} className="rounded-full bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700" onClick={() => submit(t(k))}>{t(k)}</button>)}
      </div>
      {a && (
        <dl className="space-y-3 rounded-lg border border-slate-700 p-4 text-sm">
          <Field k={t('assistant.observation')} v={a.data.observation} />
          <Field k={t('assistant.interpretation')} v={a.data.interpretation || '—'} />
          <div>
            <dt className="font-semibold text-slate-300">{t('assistant.evidence')}</dt>
            <dd>{a.data.evidence.length ? (
              <ul className="list-disc pl-5 font-mono text-xs">{a.data.evidence.map((e, i) => <li key={i}>{e.source} — {e.detail}</li>)}</ul>
            ) : '—'}</dd>
          </div>
          <Field k={t('assistant.limitations')} v={a.data.limitations} />
        </dl>
      )}
    </section>
  )
}

function Field({ k, v }: { k: string; v: string }) {
  return <div><dt className="font-semibold text-slate-300">{k}</dt><dd>{v}</dd></div>
}

const CAN: Key[] = ['limits.can1', 'limits.can2', 'limits.can3', 'limits.can4']
const CANNOT: Key[] = ['limits.cannot1', 'limits.cannot2', 'limits.cannot3', 'limits.cannot4', 'limits.cannot5']

function Limitations() {
  const { t } = useT()
  const sources = useGet<{ id: string; file: string; kind: string; available: boolean; citation?: string }[]>('/api/sources')
  const cals = useGet<{ calibration_id: string; calibration_file: string; reference_length_mm: string | null; calibration_status: string; notes: string }[]>('/api/calibrations')
  const grids = [...new Map((cals.res?.data ?? []).map((c) => [c.calibration_file, c])).values()]
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
      <div>
        <h3 className="mb-2 font-semibold">{t('limits.sources')}</h3>
        <Warnings items={sources.res?.warnings ?? []} />
        <ul className="mt-2 space-y-1 text-sm">
          {sources.res?.data.map((s) => (
            <li key={s.id}><span className="font-mono text-xs">{s.file}</span> — {s.kind} {s.available ? '' : <span className="text-amber-300">{t('limits.notFound')}</span>}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
