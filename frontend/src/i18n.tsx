import { es } from './i18n.es'
import { en } from './i18n.en'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Locale de la UI sin dependencias: diccionarios planos, `es` por defecto.
// Los valores que llegan del backend (columnas, advertencias, respuestas del asistente) no se traducen.

export type Key = keyof typeof es
export type Lang = 'es' | 'en'

const messages: Record<Lang, Record<Key, string>> = { es, en }
const STORAGE_KEY = 'lang'

// ponytail: hook y helper conviven con el provider en un solo archivo; Fast Refresh recarga el módulo completo.
// eslint-disable-next-line react/only-export-components
export const isKey = (k: string): k is Key => k in es

type Vars = Record<string, string | number>
type I18n = { lang: Lang; setLang: (l: Lang) => void; t: (key: Key, vars?: Vars) => string }

const I18nContext = createContext<I18n | null>(null)

function initialLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'es'
  } catch {
    return 'es'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  useEffect(() => {
    document.documentElement.lang = lang
    try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* almacenamiento no disponible: se ignora */ }
  }, [lang])
  const t = (key: Key, vars?: Vars) =>
    messages[lang][key].replace(/\{(\w+)\}/g, (m, name) => (vars && name in vars ? String(vars[name]) : m))
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useT(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used inside <I18nProvider>')
  return ctx
}
