import { useEffect, useState } from 'react'
import { get, type Envelope } from '../api'

// A previous response is never visible under a new case, sequence or frame key.
export function useReplayResource<T>(path: string) {
  const [result, setResult] = useState<{ path: string; data?: Envelope<T>; error?: boolean }>()
  useEffect(() => {
    const controller = new AbortController()
    get<T>(path, controller.signal).then((data) => {
      if (!controller.signal.aborted) setResult({ path, data })
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ path, error: true })
    })
    return () => controller.abort()
  }, [path])
  return result?.path === path ? result : undefined
}
