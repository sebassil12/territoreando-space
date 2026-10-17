export type PublishedQuantity = {
  reference_id: string; label: 'Published reference'; classification: 'experimental_published'
  value: number; unit: string; file: string; page: number; url: string | null
  flow: string | null; notes: string; experiment: string; transcribed_from: { reference_id: string; field: string } | null
}
export type PlaybackFrame = { time_s: number; x_front_mm: number; l_p_mm: number; x_base_mm: number }
export type Trajectory = {
  kind: 'steady_reference_kinematics'; classification: 'derived'; interpolation: 'linear_derived_not_measured'
  duration_s: number; display_extent_mm: number; vf_mm_s: number; lp_mm: number
  units: { time: 's'; position: 'mm' }; coordinate_origin: string; time_origin: string
  formulas: { x_front: string; l_p: string; x_base: string }; anchors: [PlaybackFrame, PlaybackFrame]
}
export type PlaybackCase = {
  case_id: string; label: string; status: 'available' | 'unavailable'; quality: string
  source_review: string; time_series_status: string; warnings: string[]; missing_requirements: string[]
  airflow: { direction: 'concurrent'; condition: string; reference_id: string; file: string; page: number } | null
  evidence: { vf?: PublishedQuantity; lp?: PublishedQuantity }; trajectory: Trajectory | null
}
export type PlaybackCatalog = { schema_version: '1'; cases: PlaybackCase[] }
