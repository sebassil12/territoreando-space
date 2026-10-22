// Guided-experience content map: which copy key goes with which citation and which screen.
// Copy lives in i18n.onboarding.ts; every citation below is copied from data/processed/findings.json,
// sample_conditions.csv or docs/dimensionless-model.md. 'general' marks textbook background, not a SAFFIRE result.

export type Ref = { findingId?: string; file: string; location: string } | 'general'

const URBAN = 'urban2019.pdf'
const DOD = 'SAFFIRE-II DoD.docx'
const finding = (findingId: string, file: string, location: string): Ref => ({ findingId, file, location })

export const ONBOARDING_STEPS = ['problem', 'microgravity', 'experiment', 'data', 'learned', 'unknowns', 'explore'] as const
export type StepId = (typeof ONBOARDING_STEPS)[number]

// Paragraphs per narrative step: [copy key suffix, citation]. `data`, `learned` and `explore` have dedicated views.
export const STEP_TEXT: Partial<Record<StepId, [string, Ref][]>> = {
  problem: [
    ['p1', 'general'],
    ['p2', finding('F-urban2019-006', URBAN, 'p.168, resumen')],
    ['p3', finding('F-urban2019-014', URBAN, 'p.173, §2.2')],
  ],
  microgravity: [
    ['p1', 'general'],
    ['p2', finding('F-urban2019-008', URBAN, 'p.168, resumen')],
    ['p3', finding('F-urban2019-012', URBAN, 'p.180, §5.2')],
  ],
  experiment: [
    ['p1', { file: URBAN, location: '§2.2' }],
    ['p2', { file: DOD, location: 'Tabla 1' }],
    ['p3', finding('F-urban2019-015', URBAN, 'p.173, §2.2')],
    ['p4', finding('F-urban2019-001', URBAN, 'p.177, §3')],
    ['p5', finding('F-data-006', DOD, 'Tabla 3')],
  ],
  unknowns: [
    ['u1', { file: 'scientific-limitations.md', location: 'tabla inicial' }],
    ['u2', finding('F-data-005', DOD, 'Tabla 4')],
    ['u3', finding('F-data-002', 'SAFFIRE-II_MergeResult-jpeg_v5_Final.xlsx', "hoja 'Received - jpeg'")],
    ['u4', finding('F-urban2019-009', URBAN, 'p.181, §6, conclusión 6')],
  ],
}

// Top published results, restated in plain language (onb.learned.<id>) with their citation.
export const LEARNED_FINDINGS = ['F-urban2019-007', 'F-urban2019-012', 'F-urban2019-004', 'F-urban2019-006']

export const EXPLORE_CARDS = [
  { id: 'viewer', route: 'Evidence' },
  { id: 'compare', route: 'Compare' },
  { id: 'findings', route: 'Findings' },
  { id: 'twin', route: 'Twin' },
  { id: 'fundamentals', route: 'Fundamentals' },
] as const

export type Concept = { id: string; route: string; source: Ref; analogy: boolean }

export const CONCEPTS: Concept[] = [
  { id: 'fireTriangle', route: 'Findings', source: 'general', analogy: true },
  { id: 'buoyancy', route: 'Evidence', source: 'general', analogy: true },
  { id: 'forcedFlow', route: 'Compare', source: finding('F-urban2019-012', URBAN, 'p.180, §5.2'), analogy: true },
  { id: 'spreadRate', route: 'Findings/F-urban2019-001', source: finding('F-urban2019-001', URBAN, 'p.177, §3'), analogy: true },
  { id: 'pyrolysis', route: 'Findings/F-urban2019-016', source: finding('F-urban2019-016', URBAN, 'p.175, §3'), analogy: false },
  { id: 'limitingLength', route: 'Findings/F-urban2019-004', source: finding('F-urban2019-004', URBAN, 'p.181, §5.3'), analogy: true },
  { id: 'oxygenPressure', route: 'Compare', source: finding('F-urban2019-009', URBAN, 'p.181, §6, conclusión 6'), analogy: false },
  { id: 'materials', route: 'Compare', source: { file: DOD, location: 'Tabla 1' }, analogy: false },
  { id: 'digitalImages', route: 'Viewer/S1-C2-raw-jpeg-part1', source: finding('F-urban2019-015', URBAN, 'p.173, §2.2'), analogy: true },
  { id: 'timeGaps', route: 'Evidence', source: finding('F-data-004', 'continuidad_saltos.csv', 'filas 2–6 (diff_s)'), analogy: true },
  { id: 'calibration', route: 'Limitations', source: finding('F-data-005', DOD, 'Tabla 4'), analogy: true },
  { id: 'dimensionless', route: 'Twin', source: { file: 'NASA NTRS 20040053557 (Bhattacharjee et al., 2003)', location: 'Eq. (2) p.201; Eq. (5) p.202' }, analogy: true },
  { id: 'citations', route: 'Findings', source: 'general', analogy: true },
]

// Suggested study order: each phase builds on the previous one.
export const STUDY_PHASES = [
  { id: 'combustion', concepts: ['fireTriangle', 'buoyancy', 'forcedFlow'] },
  { id: 'spread', concepts: ['spreadRate', 'pyrolysis', 'limitingLength', 'oxygenPressure', 'materials'] },
  { id: 'images', concepts: ['digitalImages', 'timeGaps', 'calibration'] },
  { id: 'reading', concepts: ['dimensionless', 'citations'] },
]
