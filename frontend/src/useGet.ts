import { useEffect, useState } from 'react'
import { get, type Envelope } from './api'

type State<T> = { path: string | null; res: Envelope<T> | null; error: string | null }

// Hook contenedor compartido: carga un sobre {data, source, warnings, quality}; descarta respuestas de otra ruta.
export function useGet<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ path: null, res: null, error: null })
  useEffect(() => {
    if (!path) return
    get<T>(path)
      .then((res) => setState({ path, res, error: null }))
      .catch((e) => setState({ path, res: null, error: String(e) }))
  }, [path])
  const isCurrent = state.path === path
  return { res: isCurrent ? state.res : null, error: isCurrent ? state.error : null }
}
