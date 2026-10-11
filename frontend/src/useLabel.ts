import { isKey, useT } from './i18n'

// Etiqueta traducida si existe la clave; si no, el código original legible.
export function useLabel() {
  const { t } = useT()
  return (prefix: string, value: string | null | undefined) => {
    if (!value) return '—'
    const key = `${prefix}.${value}`
    return isKey(key) ? t(key) : value.replaceAll('_', ' ')
  }
}
