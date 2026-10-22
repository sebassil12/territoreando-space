import { useT } from '../i18n'
import { SourceCitation } from '../ui'
import type { Ref } from './content'

// Citation line for guided copy: a finding link plus file/location, or an explicit general-knowledge tag.
export function RefLine({ source }: { source: Ref }) {
  const { t } = useT()
  if (source === 'general') {
    return <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{t('onb.general')}</span>
  }
  return (
    <span className="text-xs text-slate-400">
      {t('onb.source')}:{' '}
      {source.findingId && <a className="mr-2 font-mono text-sky-300 underline" href={`#Findings/${source.findingId}`}>{source.findingId}</a>}
      <SourceCitation path={source.file} location={source.location} />
    </span>
  )
}
