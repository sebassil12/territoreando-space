import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanModules, loadSource } from './loadScenarioModules.mjs'

const { ReplayEvidence } = await loadSource('replay/ReplayEvidence.tsx')
const { ReplayImages } = await loadSource('replay/ReplayImages.tsx')
const { I18nProvider } = await loadSource('i18n.tsx')
const { get } = await loadSource('api.ts')
after(cleanModules)

function render(component, selected) {
  return renderToStaticMarkup(React.createElement(I18nProvider, null, React.createElement(component, { selected })))
}

test('Unverified reference audit remains visible with source/page and no fidelity score', () => {
  const selected = { reference_evidence: { vf: { value: 7, unit: 'mm/s', file: 'synthetic.pdf', page: 4, notes: 'Synthetic test reference' } },
    reference_audit: { file: 'review.pdf', page: 2, notes: 'Source unavailable' }, geometry: null }
  const html = render(ReplayEvidence, selected)
  assert.match(html, /Published reference/)
  assert.match(html, /synthetic.pdf.*p.4/)
  assert.match(html, /not used to drive NASA Evidence Replay/)
  assert.match(html, /Fidelity error: unavailable/)
  assert.match(html, /No reviewed geometry available/)
  assert.doesNotMatch(html, /NaN|undefined/)
  const missing = render(ReplayEvidence, { ...selected, reference_audit: { file: null, page: null } })
  assert.match(missing, /Source citation unavailable/)
})

test('Missing experiment images never select another sample and supplied variants stay explicit', () => {
  const empty = render(ReplayImages, { sequences: [], image_mapping: null })
  assert.match(empty, /No documented image sequences/)
  assert.doesNotMatch(empty, /<img/)
  const choices = render(ReplayImages, { image_mapping: null, sequences: [
    { sequence_id: 'test-mapped', file_type: 'Mapped JPEG' }, { sequence_id: 'test-icmad', file_type: 'ICMAD PNG' },
  ] })
  assert.match(choices, /Mapped JPEG/)
  assert.match(choices, /ICMAD PNG/)
  assert.match(choices, /not untouched camera originals/)
  assert.match(choices, /Choose one sequence/)
})

test('Evidence requests pass cancellation to fetch and reject failed responses', async () => {
  const previous = globalThis.fetch
  const controller = new AbortController()
  try {
    globalThis.fetch = async (path, options) => {
      assert.equal(path, '/test'); assert.equal(options.signal, controller.signal)
      return { ok: true, json: async () => ({ data: 'synthetic' }) }
    }
    assert.deepEqual(await get('/test', controller.signal), { data: 'synthetic' })
    globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({ detail: 'Missing' }) })
    await assert.rejects(get('/test'), /404: Missing/)
  } finally { globalThis.fetch = previous }
})
