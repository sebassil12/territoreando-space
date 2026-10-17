import { useEffect, useRef, useState } from 'react'
import { assessScenario, evaluateScenario, ScenarioApiError, type Envelope, type ScenarioAssessment, type ScenarioEvaluation, type ScenarioRegistry } from '../api'
import { blankDraft, buildScenario, canEvaluate, type ScenarioDraft } from './scenarioDraft'
import { RequestGate } from './requestGate'

type SessionState = {
  phase: 'idle' | 'assessing' | 'evaluating'
  assessment: Envelope<ScenarioAssessment> | null
  evaluation: Envelope<ScenarioEvaluation> | null
  error: Error | null
}
const emptySession = (): SessionState => ({ phase: 'idle', assessment: null, evaluation: null, error: null })

export function useScenarioBuilder(registry: ScenarioRegistry | undefined) {
  const [draft, setDraft] = useState(() => blankDraft(crypto.randomUUID()))
  const [session, setSession] = useState(emptySession)
  const gate = useRef(new RequestGate())
  useEffect(() => () => { gate.current.invalidate() }, [])
  const edit = (update: (current: ScenarioDraft) => ScenarioDraft) => {
    const revision = gate.current.invalidate()
    setDraft((current) => ({ ...update(current), revision }))
    setSession(emptySession())
  }
  const changeValue = (name: string, value: string) => edit((current) => ({
    ...current, values: { ...current.values, [name]: value },
  }))
  const reset = () => edit(() => blankDraft(crypto.randomUUID()))
  // One request gate owns the assess → evaluate transaction, including edits between requests.
  const run = async (kind: 'assess' | 'evaluate' | 'calculate') => {
    if (!registry || (kind === 'evaluate' && !canEvaluate(session.assessment?.data, draft))) return
    const ticket = gate.current.begin()
    setSession({ ...emptySession(), phase: kind === 'evaluate' ? 'evaluating' : 'assessing' })
    try {
      const scenario = buildScenario(draft, registry)
      const assessment = kind === 'evaluate' ? session.assessment! : await assessScenario(scenario, ticket.signal)
      if (!gate.current.owns(ticket)) return
      verifyIdentity(assessment.data, draft)
      if (kind === 'assess' || !canEvaluate(assessment.data, draft)) {
        setSession({ ...emptySession(), assessment })
        return
      }
      setSession({ ...emptySession(), assessment, phase: 'evaluating' })
      const evaluation = await evaluateScenario(scenario, assessment.data.fingerprint, ticket.signal)
      if (!gate.current.owns(ticket)) return
      verifyIdentity(evaluation.data.assessment, draft, assessment.data.fingerprint)
      setSession({ ...emptySession(), assessment, evaluation })
    } catch (error) {
      if (gate.current.owns(ticket)) setSession({ ...emptySession(), error: error instanceof Error ? error : new Error(String(error)) })
    }
  }
  const failure = session.error instanceof ScenarioApiError ? session.error.response : null
  return { draft, edit, changeValue, reset, run, ...session, failure,
    canEvaluate: session.phase === 'idle' && canEvaluate(session.assessment?.data, draft) }
}
export type ScenarioBuilderState = ReturnType<typeof useScenarioBuilder>

function verifyIdentity(assessment: ScenarioAssessment, draft: ScenarioDraft, fingerprint?: string) {
  if (assessment.scenario_id !== draft.id || assessment.revision !== draft.revision
      || (fingerprint !== undefined && assessment.fingerprint !== fingerprint)) {
    throw new Error('The response does not belong to the current scenario assessment.')
  }
}
