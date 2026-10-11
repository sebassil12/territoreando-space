import { useState } from 'react'
import { ask, type Answer, type EvidenceItem } from '../api'
import { useT, type Key } from '../i18n'
import { ErrorText, Field, SourceCitation, WarningBanner } from '../ui'

// Preguntas verificadas contra el backend: answered (s1–s4), not_available (s5), refused (s6).
const SUGGESTIONS: Key[] = ['assistant.s1', 'assistant.s2', 'assistant.s3', 'assistant.s4', 'assistant.s5', 'assistant.s6']

export function Assistant({ sequenceId }: { sequenceId: string }) {
  const { t } = useT()
  const [q, setQ] = useState('')
  const [useContext, setUseContext] = useState(false)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (question: string, withContext = useContext) => {
    setQ(question); setBusy(true); setError(null)
    try { setAnswer((await ask(question, withContext ? sequenceId : undefined)).data) }
    catch (e) { setError(String(e)) }
    finally { setBusy(false) }
  }
  return (
    <section className="max-w-3xl space-y-4">
      <p className="text-sm text-slate-400">{t('assistant.intro')}</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) submit(q) }}>
        <input className="input flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('assistant.placeholder')} aria-label={t('assistant.question')} />
        <button className="btn" disabled={busy}>{t('assistant.ask')}</button>
      </form>
      <label className="block text-sm text-slate-300">
        <input type="checkbox" className="mr-1" checked={useContext} onChange={(e) => setUseContext(e.target.checked)} />
        {t('assistant.useContext')}: <span className="font-mono text-xs">{sequenceId}</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((k) => (
          // La pregunta sobre "esta secuencia" (s4) necesita la secuencia de contexto.
          <button key={k} className="rounded-full bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700"
            onClick={() => submit(t(k), k === 'assistant.s4' || useContext)}>{t(k)}</button>
        ))}
      </div>
      {error && <ErrorText error={t('common.error', { error })} />}
      {answer && <AnswerView answer={answer} />}
    </section>
  )
}

function AnswerView({ answer: a }: { answer: Answer }) {
  const { t } = useT()
  if (a.status === 'not_available') return <WarningBanner title={t('assistant.notAvailable')}>{a.limitations}</WarningBanner>
  if (a.status === 'refused') {
    return (
      <WarningBanner title={t('assistant.refused')}>
        <p>{a.interpretation}</p>
        <EvidenceList items={a.evidence} />
      </WarningBanner>
    )
  }
  return (
    <dl className="space-y-3 rounded-lg border border-slate-700 p-4 text-sm">
      <Field label={t('assistant.observation')}>{a.observation}</Field>
      <Field label={`${t('assistant.interpretation')} · ${t('assistant.interpretationNote')}`}>{a.interpretation || '—'}</Field>
      <Field label={t('assistant.evidence')}><EvidenceList items={a.evidence} /></Field>
      <Field label={t('assistant.limitations')}>{a.limitations || '—'}</Field>
    </dl>
  )
}

function EvidenceList({ items }: { items: EvidenceItem[] }) {
  if (!items.length) return <>—</>
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((e, i) => (
        <li key={i}>
          {e.finding_id && <a className="mr-2 font-mono text-xs text-sky-300 underline" href={`#Findings/${e.finding_id}`}>{e.finding_id}</a>}
          <SourceCitation path={e.source_path ?? e.source} location={e.source_location ?? e.detail} />
        </li>
      ))}
    </ul>
  )
}
