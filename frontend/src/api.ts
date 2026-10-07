export type Envelope<T> = { data: T; source: string; warnings: string[]; quality: string }

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

export type Reference = {
  id: string
  experiment: string
  material: string
  dimensions: string
  oxygen: string
  flow: string
  pressure: string
  published_result: string
  value: number | null
  unit: string
  source: string
  page: number
  notes: string
}
export type References = {
  disclaimer: string
  sources: Record<string, { file: string; citation: string; doi: string }>
  results: Reference[]
  facts: { id: string; text: string; source: string; page: number }[]
}

export type Answer = {
  observation: string
  interpretation: string
  evidence: { source: string; detail: string }[]
  limitations: string
  grounded: boolean
}

export async function get<T>(path: string): Promise<Envelope<T>> {
  const r = await fetch(path)
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
