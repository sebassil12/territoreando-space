import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanModules, loadSource } from './loadScenarioModules.mjs'

const draft = await loadSource('scenario/scenarioDraft.ts')
const { RequestGate } = await loadSource('scenario/requestGate.ts')
const { ScenarioModels } = await loadSource('scenario/ScenarioModels.tsx')
const { chooseModel, describeScene } = await loadSource('scenario/guidedScenario.ts')
const { createIllustration } = await loadSource('scenario/scene/sceneObjects.ts')
const { ModelChooser } = await loadSource('scenario/GuidedControls.tsx')
const { ScenarioResults, ScientificDetails } = await loadSource('scenario/ScenarioResults.tsx')
const { I18nProvider } = await loadSource('i18n.tsx')
const { ScenarioApiError, evaluateScenario } = await loadSource('api.ts')
after(cleanModules)

const model = {
  model_id: draft.DIMENSIONLESS_MODEL, implemented: true, available_output: 'dimensionless_branch',
  flow_configuration: 'opposed', gravity_regime: 'microgravity', thermal_regime: 'thermally_thin',
  required_parameters: { eta_g: 'dimensionless', radiation_number: 'dimensionless' },
  parameter_alternatives: [], alternative_parameter_units: {}, required_assumptions: ['steady_reduced_balance'],
  source: { file: '20040053557.pdf', page: 202, equation: '(5)', definition_page: 201 },
  evidence: { equation: 'verified_file_page', software: 'implemented_tested', reproduction: 'not_attempted', experimental_validation: 'unvalidated' },
}
const urban = {
  ...model, model_id: 'urban2019_concurrent_spread', implemented: false, available_output: 'concurrent_spread_speed',
  required_parameters: {}, parameter_alternatives: [['solid_areal_mass'], ['solid_density', 'solid_full_thickness']],
  alternative_parameter_units: { solid_areal_mass: 'kg/m2', solid_density: 'kg/m3', solid_full_thickness: 'm' },
}
const registry = { schema_version: '1', registry_version: '1', models: [model, urban] }
const request = () => draft.buildScenario(draft.blankDraft('test-case'), registry)

test('Empty scientific fields stay absent; zero must be entered explicitly', () => {
  const empty = JSON.parse(JSON.stringify(request()))
  assert.deepEqual(empty.model_inputs[model.model_id], {})
  assert.deepEqual(empty.fuel.geometry, {})
  assert.equal(empty.environment.airflow.direction, undefined)
  assert.equal(draft.numericInput('', 'dimensionless'), undefined)
  const explicit = draft.numericInput('0', 'dimensionless')
  assert.equal(explicit.value, 0)
  assert.equal(explicit.origin, 'user_assumption')
  for (const invalid of ['NaN', 'Infinity', '1e999', '0x10', '12x']) assert.throws(() => draft.numericInput(invalid, 'dimensionless'))
})
test('Serialization limits inputs to the registry and one explicit mass alternative', () => {
  let value = draft.blankDraft('test-case')
  value.values[`model_inputs.${model.model_id}.unknown_parameter`] = '1'
  value.values[`model_inputs.${urban.model_id}.solid_density`] = '1'
  value = draft.alternativeChoice(value, urban, '0')
  assert.equal(value.values[`model_inputs.${urban.model_id}.solid_density`], undefined)
  value.values[`model_inputs.${urban.model_id}.solid_areal_mass`] = '1'
  value.values[`model_inputs.${urban.model_id}.solid_density`] = '2'
  const result = draft.buildScenario(value, registry)
  assert.equal(result.model_inputs[model.model_id].unknown_parameter, undefined)
  assert.deepEqual(Object.keys(result.model_inputs[urban.model_id]), ['solid_areal_mass'])
  assert.equal(draft.activeParameters(value, urban).solid_density, undefined)
})
test('Research availability and requested-output compatibility never enable a fallback', () => {
  const value = draft.blankDraft('test-case')
  const candidate = { model, readiness: 'eligible', compatibility: 'compatible' }
  const assessment = { scenario_id: value.id, revision: 0, selected_models: { dimensionless_branch: model.model_id }, blocked_outputs: [] }
  assert.equal(draft.candidateStatus(candidate, assessment), 'AVAILABLE')
  assert.equal(draft.candidateStatus({ ...candidate, compatibility: 'incompatible' }, assessment), 'INCOMPATIBLE')
  assert.equal(draft.candidateStatus({ ...candidate, readiness: 'blocked' }, assessment), 'BLOCKED')
  assert.equal(draft.candidateStatus(candidate, { ...assessment, selected_models: {} }), 'BLOCKED')
  assert.equal(draft.canEvaluate(assessment, value), true)
  assert.equal(draft.canEvaluate(assessment, { ...value, revision: 1 }), false)
  assert.equal(draft.canEvaluate({ ...assessment, blocked_outputs: ['critical_flow_speed'] }, value), false)
})
test('Edits and newer requests abort ownership; delayed responses cannot restore results', async () => {
  const gate = new RequestGate()
  const first = gate.begin()
  const revision = gate.invalidate()
  assert.equal(revision, 1)
  assert.equal(first.signal.aborted, true)
  assert.equal(gate.owns(first), false)
  const second = gate.begin()
  const third = gate.begin()
  await Promise.resolve()
  assert.equal(second.signal.aborted, true)
  assert.equal(gate.owns(second), false)
  assert.equal(gate.owns(third), true)
})
test('Model panels retain exact missing paths, evidence, source and unresolved pages', () => {
  const missing = 'model_inputs.urban2019_concurrent_spread.solid_specific_heat'
  const blocker = { code: 'model_not_implemented', message: 'No evaluator is available.', needed_evidence: 'Reviewed evaluator.', next_action: 'Keep blocked.' }
  const researched = { ...urban, source: { file: 'urban2019.pdf', page: null, equation: '(2)' } }
  const assessment = { selected_models: {}, candidates: [{ model: researched, compatibility: 'compatible', readiness: 'blocked', missing_parameters: [missing], reasons: [blocker] }] }
  const html = renderToStaticMarkup(createElement(I18nProvider, null,
    createElement(ScenarioModels, { models: [researched], assessment })))
  for (const text of ['BLOCKED', missing, blocker.message, blocker.needed_evidence, 'urban2019.pdf', 'Printed page unverified', 'unvalidated']) assert.ok(html.includes(text))
})
test('Selecting an explicit setup records its assumptions but never supplies numeric inputs', () => {
  const selected = chooseModel(draft.blankDraft('test-case'), model)
  const request = draft.buildScenario(selected, registry)
  assert.equal(request.model_preference, model.model_id)
  assert.deepEqual(request.model_inputs[model.model_id], {})
  assert.equal(request.environment.airflow.direction.value, 'opposed')
  assert.equal(request.environment.gravity_regime.origin, 'user_assumption')
  assert.equal(request.assumptions.steady_reduced_balance.value, 'acknowledged')
  const changed = chooseModel({ ...selected, values: { oxygen: '20', 'model_inputs.old.eta_g': '1' } }, urban)
  assert.equal(changed.values.oxygen, undefined)
  const html = renderToStaticMarkup(createElement(I18nProvider, null,
    createElement(ModelChooser, { models: [model], state: { draft: selected } })))
  for (const text of ['Choosing a setup', 'steady reduced energy balance', '20040053557.pdf', 'Use this hypothetical setup']) assert.ok(html.includes(text))
  assert.equal(html.includes('<input'), false)
})
test('Scene data cannot turn numeric assumptions or results into flame appearance', () => {
  const selected = chooseModel(draft.blankDraft('test-case'), model)
  const first = describeScene(selected)
  const modified = describeScene({ ...selected, values: { ...selected.values, oxygen: '90', pressure: '999',
    'airflow.speed': '100', 'geometry.length': '1000', 'model_inputs.bhattacharjee2004_dimensionless.eta_g': '100' } })
  assert.deepEqual(modified, first)
  assert.deepEqual(Object.keys(first).sort(), ['flow', 'gravity', 'shape'])
  const initial = createIllustration(first)
  const concurrent = createIllustration({ ...first, flow: 'concurrent' })
  assert.deepEqual(initial.flame.children[0].geometry.attributes.position.array, concurrent.flame.children[0].geometry.attributes.position.array)
  assert.equal(initial.flame.children[0].material.color.getHex(), concurrent.flame.children[0].material.color.getHex())
  const a = initial.assembly.getObjectByName('declared-airflow-direction')
  const b = concurrent.assembly.getObjectByName('declared-airflow-direction')
  assert.notDeepEqual(a.quaternion.toArray(), b.quaternion.toArray())
  assert.equal(createIllustration({ ...first, flow: 'unspecified' }).assembly.getObjectByName('declared-airflow-direction'), undefined)
})
test('Numerical results retain branch distinctions, null eta_f and scientific evidence', () => {
  const assessment = { fingerprint: 'current-fingerprint', blocked_outputs: [], selected_models: {}, candidates: [] }
  const envelope = { source: 'equation-source.pdf, p.202', quality: 'modelled_unvalidated', warnings: ['Mathematical output only.'] }
  for (const [status, eta, discriminant] of [
    ['positive_branch', 1, 1], ['zero_branch', 0, 0], ['negative_branch', -1, 1], ['no_real_branch', null, -1],
  ]) {
    const evaluation = { ...envelope, data: { assessment, results: [{
      source: model.source, evaluator_id: 'existing-evaluator', evaluator_version: '1',
      eta_f: eta, discriminant, model_status: status,
    }] } }
    const state = { draft: draft.blankDraft('test-case'), evaluation, assessment: { data: assessment } }
    const html = renderToStaticMarkup(createElement(I18nProvider, null,
      createElement('div', null,
        createElement(ScenarioResults, { state, registry: { ...envelope, data: registry } }),
        createElement(ScientificDetails, { state, registry: { ...envelope, data: registry } }))))
    for (const text of [status, 'discriminant', envelope.source, envelope.quality, envelope.warnings[0], '20040053557.pdf']) {
      assert.ok(html.includes(text))
    }
    if (eta === null) assert.ok(html.includes('No real branch (eta_f is null)'))
    else assert.match(html, new RegExp(`data-testid="eta-f"[^>]*>${eta}</p>`))
  }
})
test('API errors preserve status, source, quality, warnings and refusal assessment', async () => {
  const oldFetch = globalThis.fetch
  const refusal = { data: { error: 'Scenario evaluation is blocked.', assessment: { revision: 2 } },
    source: 'cited-source.pdf, p.202', warnings: ['No fallback.'], quality: 'unavailable' }
  globalThis.fetch = async (_path, options) => {
    const sent = JSON.parse(options.body)
    assert.equal(sent.assessment_fingerprint, 'fingerprint')
    assert.ok(options.signal instanceof AbortSignal)
    return new Response(JSON.stringify(refusal), { status: 422 })
  }
  try {
    await assert.rejects(evaluateScenario(request(), 'fingerprint', new AbortController().signal), (error) => {
      assert.ok(error instanceof ScenarioApiError)
      assert.equal(error.status, 422)
      assert.deepEqual(error.response, refusal)
      return true
    })
  } finally { globalThis.fetch = oldFetch }
})
