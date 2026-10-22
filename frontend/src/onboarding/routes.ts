// Hash route ids shown as navigation tabs (stable English ids; only the label is translated).
export const TABS = [
  'Onboarding', 'Fundamentals', 'Overview', 'Findings', 'Ranked', 'Compare', 'Evidence', 'Assistant', 'Twin', 'Limitations',
] as const
export type TabId = (typeof TABS)[number]

// Every first hash segment the app can render; `Viewer` is reached from Evidence, not from the nav.
export const ROUTES: readonly string[] = [...TABS, 'Viewer']
