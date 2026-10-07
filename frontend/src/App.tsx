import { useEffect, useMemo, useState } from 'react'
import { ask, get, type Answer, type Envelope, type References, type Sequence } from './api'
import { QualityBadge, Warnings } from './ui'
import { Viewer } from './Viewer'

const TABS = ['Overview', 'Sequences', 'Viewer', 'Scientific context', 'Assistant', 'Sources & limitations'] as const
type Tab = (typeof TABS)[number]

export default function App() {
  // Deep link for demos: #Viewer/S1-C2-raw-jpeg-part1
  const [hashTab, hashSeq] = decodeURIComponent(location.hash.slice(1)).split('/')
  const [tab, setTab] = useState<Tab>(TABS.includes(hashTab as Tab) ? (hashTab as Tab) : 'Overview')
  const [sequenceId, setSequenceId] = useState(hashSeq || 'S1-C2-raw-jpeg-part1')
  const open = (id: string) => { setSequenceId(id); setTab('Viewer') }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-6 space-y-3">
        <h1 className="text-2xl font-bold">Flame in Freefall <span className="font-normal text-slate-400">· SAFFIRE-II evidence explorer</span></h1>
        <nav className="flex flex-wrap gap-1" aria-label="Views">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined}
              className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
              {t}
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
  return (
    <article className="max-w-3xl space-y-4 leading-relaxed">
      <p>
        On Earth, hot gases rise, so flames are shaped by buoyancy. In orbit there is almost no gravity, so a flame is
        shaped mostly by the slow air flow from ventilation. That changes how fast and how far fire spreads over a material
        — which matters for spacecraft fire safety.<Cite>urban2019, p.168–169</Cite>
      </p>
      <p>
        Saffire-II was flown on the Cygnus cargo vehicle (mission CRS OA-5) after it left the ISS. It burned nine small
        samples (29 cm × 5 cm) in a flow tunnel, including cotton-fiberglass fabric (Samples 5 and 6) and a 1-cm-thick PMMA
        slab (Sample 9).<Cite>urban2019, p.173</Cite> Two cameras recorded the burns at 30 frames per second.<Cite>urban2019, p.173</Cite>
      </p>
      <p>
        This dashboard lets you browse the released image sequences, check whether each one is temporally continuous,
        play them frame by frame with full traceability, and see simple pixel statistics next to the published results.
      </p>
      <div className="rounded-lg border border-slate-700 p-4 text-sm">
        <h2 className="mb-2 font-semibold">Scope</h2>
        <ul className="list-disc space-y-1 pl-5 text-slate-300">
          <li>An evidence explorer — not a combustion simulator, not a fire-risk predictor, not a digital twin.</li>
          <li>Image metrics are in pixels and 8-bit intensity. No temperature, no physical length (calibration is pending).</li>
          <li>Folder labels such as S1 or C2 are not proven to be sample numbers or camera identities.</li>
        </ul>
      </div>
      <button className="btn" onClick={() => onOpen('S1-C2-raw-jpeg-part1')}>Start the demo: open S1-C2 raw part 1 →</button>
    </article>
  )
}

const FILTERS = ['group', 'camera', 'file_type', 'processing_variant', 'temporal_quality'] as const

function Catalog({ onOpen }: { onOpen: (id: string) => void }) {
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
            {k.replace(/_/g, ' ')}
            <select className="input ml-1" value={filter[k] ?? ''} onChange={(e) => setFilter({ ...filter, [k]: e.target.value })}>
              <option value="">all</option>
              {options[k]?.map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-400">
            <tr>{['Sequence', 'Group', 'Channel', 'Type', 'Role', 'Frames', 'Duration', 'Median Δt', 'Gaps', 'Quality', 'Calibration'].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.sequence_id} className="cursor-pointer border-t border-slate-800 hover:bg-slate-900" onClick={() => onOpen(s.sequence_id)}>
                <td className="px-2 py-1.5 font-mono text-xs text-sky-300 underline">{s.sequence_id}</td>
                <td className="px-2">{s.group}</td>
                <td className="px-2">{s.camera}</td>
                <td className="px-2">{s.file_type}</td>
                <td className="px-2 text-xs">{s.sequence_role.replace(/_/g, ' ')}{s.primary_sequence_id && <div className="text-slate-500">of {s.primary_sequence_id}</div>}</td>
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
      <p className="text-xs text-slate-500">Source: {res?.source}. Raw and Mapped versions of the same time window are listed separately as processing variants and are never merged.</p>
    </section>
  )
}

function Science() {
  const { res, error } = useGet<References>('/api/references')
  if (error) return <p className="text-red-300">{error}</p>
  if (!res) return <p className="text-slate-400">Loading…</p>
  const src = res.data.sources.urban2019
  return (
    <section className="space-y-5">
      <Warnings items={res.warnings} />
      <p className="text-sm text-slate-400">{src?.citation} DOI {src?.doi}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-400">
            <tr>{['', 'Experiment', 'Material', 'Conditions', 'Result', 'Value', 'Source'].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {res.data.results.map((r) => (
              <tr key={r.id} className="border-t border-slate-800 align-top">
                <td className="px-2 py-2"><span className="whitespace-nowrap rounded bg-violet-900/60 px-2 py-0.5 text-xs text-violet-200">Published reference</span></td>
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
      <h3 className="font-semibold">Key published findings</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {res.data.facts.map((f) => <li key={f.id}>{f.text}<Cite>{f.source}, p.{f.page}</Cite></li>)}
      </ul>
      <p className="text-xs text-slate-500">
        How to compare: published values are in cm and mm/s and come from calibrated tracking by the authors. This dashboard's
        metrics are in pixels and are not linked to a specific sample — compare trends, not numbers.
      </p>
    </section>
  )
}

const SUGGESTIONS = [
  'Is this sequence continuous?',
  'What does this sequence represent?',
  'What do the brightness metrics show?',
  'What does the paper say about PMMA limiting length?',
  'What is the flame temperature?',
]

function Assistant({ sequenceId }: { sequenceId: string }) {
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
        Deterministic, source-grounded assistant. It answers only from the catalogs and the transcribed paper.
        Context sequence: <span className="font-mono">{sequenceId}</span>
      </p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) submit(q) }}>
        <input className="input flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this sequence or the paper…" aria-label="Question" />
        <button className="btn" disabled={busy}>Ask</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => <button key={s} className="rounded-full bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700" onClick={() => submit(s)}>{s}</button>)}
      </div>
      {a && (
        <dl className="space-y-3 rounded-lg border border-slate-700 p-4 text-sm">
          <Field k="Observation" v={a.data.observation} />
          <Field k="Interpretation" v={a.data.interpretation || '—'} />
          <div>
            <dt className="font-semibold text-slate-300">Evidence</dt>
            <dd>{a.data.evidence.length ? (
              <ul className="list-disc pl-5 font-mono text-xs">{a.data.evidence.map((e, i) => <li key={i}>{e.source} — {e.detail}</li>)}</ul>
            ) : '—'}</dd>
          </div>
          <Field k="Limitations" v={a.data.limitations} />
        </dl>
      )}
    </section>
  )
}

function Field({ k, v }: { k: string; v: string }) {
  return <div><dt className="font-semibold text-slate-300">{k}</dt><dd>{v}</dd></div>
}

function Limitations() {
  const sources = useGet<{ id: string; file: string; kind: string; available: boolean; citation?: string }[]>('/api/sources')
  const cals = useGet<{ calibration_id: string; calibration_file: string; reference_length_mm: string | null; calibration_status: string; notes: string }[]>('/api/calibrations')
  const grids = [...new Map((cals.res?.data ?? []).map((c) => [c.calibration_file, c])).values()]
  return (
    <section className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-semibold text-emerald-300">What this dashboard can show</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Which image sequences exist, their frame counts, time spans and gaps.</li>
            <li>Each frame with its original path, raw_id and relative time.</li>
            <li>Pixel statistics (brightness, bright area, centroid, bounding box) over time.</li>
            <li>Published values from urban2019, labeled as such, with page numbers.</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-semibold text-red-300">What it cannot conclude</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Temperature, heat-release rate, oxygen concentration or fire risk.</li>
            <li>Flame length or spread rate in mm or cm (calibration not validated).</li>
            <li>Which Saffire-2 sample or material a folder (S1…S9, F1, F2) shows.</li>
            <li>Rates from sequences with temporal gaps (the Mapped TIFF series).</li>
            <li>Comparisons between processing variants (raw / mapped / ICMAD) as if they were the same signal.</li>
          </ul>
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">Calibration status</h3>
        <ul className="space-y-1 font-mono text-xs">
          {grids.map((c) => (
            <li key={c.calibration_file}>
              {c.calibration_file.split('/').pop()} · reference {c.reference_length_mm ? `${c.reference_length_mm} mm block` : 'unknown'} · <span className="text-amber-300">{c.calibration_status}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-slate-500">Calibration unavailable for measurement: all values are shown in pixels only.</p>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">Sources</h3>
        <Warnings items={sources.res?.warnings ?? []} />
        <ul className="mt-2 space-y-1 text-sm">
          {sources.res?.data.map((s) => (
            <li key={s.id}><span className="font-mono text-xs">{s.file}</span> — {s.kind} {s.available ? '' : <span className="text-amber-300">(not found)</span>}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
