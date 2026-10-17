export type Envelope<T> = { data: T; source: string; warnings: string[]; quality: string }
export type * from './scenarioTypes'
import type { ScenarioAssessment, ScenarioEvaluation, ScenarioFailure, ScenarioRegistry, ScenarioRequest } from './scenarioTypes'

export type Sequence = {
  sequence_id: string
  group: string
  camera: string
  file_type: string
  processing_variant: string
  part: string | null
  folder: string
  n_files: number
  first_raw_id: number
  last_raw_id: number
  duration_s: number
  median_diff_ms: number
  max_diff_ms: number
  duplicates: number
  n_gaps_gt_2x: number
  temporal_quality: string
  sequence_role: string
  calibration_file: string | null
  calibration_status: string
  primary_sequence_id: string | null
  source_file: string
}

export type Frame = {
  frame_id: string
  sequence_id: string
  file_name: string
  relative_path: string
  raw_id: number
  frame_index: number
  time_s: number
  source_file: string
  availability: string
  warning: string | null
}

export type FrameDetail = Frame & {
  image_available: boolean
  image_url: string | null
  metrics: Record<string, { value: number; unit: string; confidence: string }>
}

export type MetricPoint = { frame_id: string; time_s: number } & Record<string, number | string>
export type Metrics = { sequence_id: string; units: Record<string, string>; method: string | null; points: MetricPoint[] }

export type Level = 'high' | 'medium' | 'low'

// Espejo de backend/findings.py (Finding.to_dict).
export type Finding = {
  finding_id: string
  title: string
  summary: string
  experiment: string | null
  sample: string | null
  material: string | null
  condition: string | null
  theme: string
  observation: string
  metric: string | null
  value: number | null
  unit: string | null
  evidence_type: string
  source_path: string
  source_location: string
  source_quote: string | null
  confidence: Level
  confidence_rationale: string
  safety_relevance: Level
  safety_relevance_rationale: string
  limitations: string[]
  related_sequences: string[]
  data_status: string
  reference_id: string | null
}

export type ScoreItem = { criterion: string; value: string; points: number }
export type RankedFinding = Finding & { rank: number; score: number; score_breakdown: ScoreItem[] }
export type RankingCriteria = { rules: Record<string, Record<string, number>>; tie_break: string[]; note: string }
export type Ranked = { ranking_criteria: RankingCriteria; findings: RankedFinding[] }

export type RelatedSequence = {
  sequence_id: string
  available: boolean
  warnings: string[]
  group?: string
  camera?: string
  file_type?: string
  processing_variant?: string
  sequence_role?: string
  temporal_quality?: string
  duration_s?: number
  n_files?: number
}

export type SampleConditions = {
  sample: string
  folder_label: string
  psi_record_meaning: string
  material: string | null
  thickness_mm: number | null
  airflow_cm_s_dod: number | null
  airflow_cm_s_urban2019: number | null
  airflow_status: string | null
  igniter_position: string | null
  oxygen_pct: number | null
  pressure_atm: number | null
  dimensions_cm: string | null
  jpeg_received: number | null
  jpeg_local: number | null
  local_sequences: string | null
  source_path: string
  source_location: string
  confidence: Level
  notes: string | null
}

export type FindingView = { finding: Finding; conditions: SampleConditions | null; related_sequences: RelatedSequence[] }

export type FactorStatus = 'known' | 'unknown' | 'conflicting'
export type ComparisonFactor = {
  factor: string
  values: Record<string, string | number | null>
  status: Record<string, FactorStatus>
}
export type Comparison = {
  samples: string[]
  conditions: SampleConditions[]
  factors: ComparisonFactor[]
  differing_factors: string[]
  missing_factors: string[]
  conflicting_factors: string[]
  comparison_status: 'limited' | 'same_reported_conditions'
}

export type EvidenceItem = {
  source: string
  detail: string
  finding_id?: string
  source_path?: string
  source_location?: string
  evidence_type?: string
}

export type Answer = {
  status: 'answered' | 'refused' | 'not_available'
  observation: string
  interpretation: string
  evidence: EvidenceItem[]
  limitations: string
  grounded: boolean
  evidence_sources: string[]
}

export async function get<T>(path: string, signal?: AbortSignal): Promise<Envelope<T>> {
  const r = await fetch(path, { signal })
  if (!r.ok) throw new Error(`${r.status}: ${(await r.json().catch(() => ({}))).detail ?? r.statusText}`)
  return r.json()
}

export async function ask(question: string, sequence_id?: string): Promise<Envelope<Answer>> {
  const r = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, sequence_id }),
  })
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}

export class ScenarioApiError extends Error {
  status: number
  response: Envelope<ScenarioFailure>
  constructor(status: number, response: Envelope<ScenarioFailure>) {
    super(response.data.error ?? response.data.errors?.map((e) => e.message).join('; ') ?? String(status))
    this.status = status
    this.response = response
  }
}

async function scenarioFetch<T>(path: string, body: unknown, signal: AbortSignal): Promise<Envelope<T>> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const payload = await response.json()
  if (!response.ok) throw new ScenarioApiError(response.status, payload)
  return payload
}

export const loadScenarioModels = (signal: AbortSignal) =>
  scenarioFetch<ScenarioRegistry>('/api/twin/scenario-models', undefined, signal)
export const assessScenario = (scenario: ScenarioRequest, signal: AbortSignal) =>
  scenarioFetch<ScenarioAssessment>('/api/twin/scenarios/assess', scenario, signal)
export const evaluateScenario = (scenario: ScenarioRequest, fingerprint: string, signal: AbortSignal) =>
  scenarioFetch<ScenarioEvaluation>('/api/twin/scenarios/evaluate', { scenario, assessment_fingerprint: fingerprint }, signal)

export const loadPlaybackCases = (signal: AbortSignal) =>
  scenarioFetch<import('./playback/types').PlaybackCatalog>('/api/twin/playback-cases', undefined, signal)

export type ReplayCitation = { file: string | null; page: number | null; url: string | null; location?: string }
export type ReplaySequence = Sequence & {
  catalog_frame_count: number; local_frame_count: number; asset_status: string; timestamp_basis: string
}
export type ReplayCase = {
  case_id: string; label: string; quality: 'qualitative_only'
  reference_evidence: import('./playback/types').PlaybackCase['evidence']
  reference_audit: ReplayCitation & { status: string; notes: string | null }
  geometry: (ReplayCitation & { dimensions: string; status: string }) | null
  image_mapping: ReplayCitation | null; sequences: ReplaySequence[]; warnings: string[]
  synchronization: { status: 'unavailable'; enabled: false; time_transform: null }
  reconstruction: { status: 'schematic_only'; trajectory: null; fidelity_error: null }
}
export type ReplayCatalog = { schema_version: '1'; cases: ReplayCase[] }
