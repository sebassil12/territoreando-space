import { useEffect, useState } from 'react'
import { useT, type Lang } from './i18n'
import { Assistant } from './screens/Assistant'
import { Compare } from './screens/Compare'
import { Evidence, EvidenceViewer } from './screens/Evidence'
import { Fundamentals } from './screens/Fundamentals'
import { Onboarding } from './screens/Onboarding'
import { TABS, type TabId } from './onboarding/routes'
import { FindingDetail } from './screens/FindingDetail'
import { FindingsExplorer } from './screens/FindingsExplorer'
import { Limitations } from './screens/Limitations'
import { Ranked } from './screens/Ranked'
import { SafetyOverview } from './screens/SafetyOverview'
import { Twin } from './screens/Twin'

// Claves internas de pestaña (en inglés) usadas en los enlaces por hash; solo se traduce la etiqueta.
type Tab = TabId | 'Viewer'
const DEFAULT_SEQUENCE = 'S1-C2-raw-jpeg-part1'

type Route = { tab: Tab; id: string | null }

// La navegación vive en el hash: #Onboarding/<paso>, #Findings/<finding_id>, #Viewer/<sequence_id>, #Compare, …
function parseHash(): Route {
  const [tab, id] = decodeURIComponent(location.hash.slice(1)).split('/')
  const isTab = tab === 'Viewer' || TABS.includes(tab as TabId)
  return { tab: isTab ? (tab as Tab) : 'Onboarding', id: id || null }
}

function useHashRoute(): Route {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const onChange = () => { setRoute(parseHash()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export default function App() {
  const { tab, id } = useHashRoute()
  const [contextSequence, setContextSequence] = useState(DEFAULT_SEQUENCE)
  // La última secuencia abierta en el visor pasa a ser la secuencia de contexto del asistente.
  if (tab === 'Viewer' && id && id !== contextSequence) setContextSequence(id)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Header active={tab === 'Viewer' ? 'Evidence' : tab} />
      <main>
        {tab === 'Onboarding' && <Onboarding step={Number(id) || 1} />}
        {tab === 'Fundamentals' && <Fundamentals />}
        {tab === 'Overview' && <SafetyOverview />}
        {tab === 'Findings' && (id ? <FindingDetail findingId={id} /> : <FindingsExplorer />)}
        {tab === 'Ranked' && <Ranked />}
        {tab === 'Compare' && <Compare />}
        {tab === 'Evidence' && <Evidence />}
        {tab === 'Viewer' && <EvidenceViewer sequenceId={id ?? DEFAULT_SEQUENCE} />}
        {tab === 'Assistant' && <Assistant sequenceId={contextSequence} />}
        {tab === 'Twin' && <Twin />}
        {tab === 'Limitations' && <Limitations />}
      </main>
    </div>
  )
}

function Header({ active }: { active: Tab }) {
  const { t, lang, setLang } = useT()
  return (
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
          <a key={k} href={`#${k}`} aria-current={active === k ? 'page' : undefined}
            className={`rounded-md px-3 py-1.5 text-sm ${active === k ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            {t(`tab.${k}`)}
          </a>
        ))}
      </nav>
    </header>
  )
}
