import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanModules, loadSource } from './loadScenarioModules.mjs'

const { onboardingMessages } = await loadSource('i18n.onboarding.ts')
const { es } = await loadSource('i18n.es.ts')
const { en } = await loadSource('i18n.en.ts')
const { ONBOARDING_STEPS, CONCEPTS, STUDY_PHASES, LEARNED_FINDINGS } = await loadSource('onboarding/content.ts')
const { ROUTES } = await loadSource('onboarding/routes.ts')
const { I18nProvider } = await loadSource('i18n.tsx')
const { Fundamentals } = await loadSource('screens/Fundamentals.tsx')
const { Onboarding } = await loadSource('screens/Onboarding.tsx')
after(cleanModules)

const findings = JSON.parse(await readFile(new URL('../../data/processed/findings.json', import.meta.url), 'utf8')).findings
const findingById = Object.fromEntries(findings.map((f) => [f.finding_id, f]))
const render = (component, props = {}) =>
  renderToStaticMarkup(React.createElement(I18nProvider, null, React.createElement(component, props)))

test('Onboarding and full locale dictionaries have identical, non-empty es/en keys', () => {
  assert.deepEqual(Object.keys(onboardingMessages.en).sort(), Object.keys(onboardingMessages.es).sort())
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort())
  for (const lang of ['es', 'en']) {
    for (const [key, value] of Object.entries(onboardingMessages[lang])) assert.ok(value.trim(), `${lang}:${key} is empty`)
  }
})

test('Onboarding steps follow the guided narrative order and have copy in both locales', () => {
  assert.deepEqual(ONBOARDING_STEPS, ['problem', 'microgravity', 'experiment', 'data', 'learned', 'unknowns', 'explore'])
  for (const step of ONBOARDING_STEPS) {
    for (const lang of [es, en]) assert.ok(lang[`onb.step.${step}.title`], `missing title for ${step}`)
  }
})

test('Every Fundamentals concept links to an existing route and is cited or tagged as general knowledge', () => {
  assert.ok(CONCEPTS.length >= 10)
  for (const concept of CONCEPTS) {
    assert.ok(ROUTES.includes(concept.route.split('/')[0]), `${concept.id} links to unknown route ${concept.route}`)
    for (const suffix of ['title', 'body', 'where']) assert.ok(es[`fund.${concept.id}.${suffix}`] && en[`fund.${concept.id}.${suffix}`])
    assert.equal(Boolean(es[`fund.${concept.id}.analogy`]), Boolean(concept.analogy), `${concept.id} analogy flag mismatch`)
    if (concept.source === 'general') continue
    assert.ok(concept.source.file && concept.source.location, `${concept.id} lacks a citation`)
    if (concept.source.findingId) {
      const finding = findingById[concept.source.findingId]
      assert.ok(finding, `${concept.id} cites unknown finding ${concept.source.findingId}`)
      assert.ok(finding.source_path.endsWith(concept.source.file), `${concept.id} file does not match its finding`)
    }
  }
})

test('Suggested study path covers every concept exactly once', () => {
  const ordered = STUDY_PHASES.flatMap((phase) => phase.concepts)
  assert.deepEqual([...ordered].sort(), CONCEPTS.map((c) => c.id).sort())
  assert.equal(new Set(ordered).size, ordered.length)
})

test('Learned findings exist and keep their citation', () => {
  assert.ok(LEARNED_FINDINGS.length >= 3 && LEARNED_FINDINGS.length <= 5)
  for (const id of LEARNED_FINDINGS) {
    assert.equal(findingById[id]?.evidence_type, 'published_result', `${id} is not a published result`)
    assert.ok(es[`onb.learned.${id}`] && en[`onb.learned.${id}`])
  }
})

test('Twin tab label no longer claims a digital twin', () => {
  assert.equal(es['tab.Twin'], 'Reconstrucción 3D')
  assert.equal(en['tab.Twin'], '3D reconstruction')
  assert.ok(ROUTES.includes('Twin') && ROUTES.includes('Onboarding') && ROUTES.includes('Fundamentals'))
})

test('Screens render without data: stepper progress and general-knowledge tags are visible', () => {
  const first = render(Onboarding, { step: 1 })
  assert.match(first, /1 \/ 7/)
  assert.match(first, /href="#Onboarding\/2"/)
  assert.match(first, /href="#Fundamentals"/)
  const last = render(Onboarding, { step: 7 })
  assert.match(last, /href="#Compare"/)
  assert.doesNotMatch(last, /href="#Onboarding\/8"/)
  const fundamentals = render(Fundamentals)
  assert.match(fundamentals, /Conocimiento general/)
  assert.match(fundamentals, /F-urban2019-016/)
  assert.doesNotMatch(fundamentals, /undefined|NaN/)
})
