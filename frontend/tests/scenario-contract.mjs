import { readFileSync } from 'node:fs'
import { cleanModules, loadSource } from './loadScenarioModules.mjs'

// Backend tests supply real registry metadata and validate these frontend-produced requests.
const registry = JSON.parse(readFileSync(0, 'utf8'))
const { blankDraft, buildScenario } = await loadSource('scenario/scenarioDraft.ts')
const { chooseModel } = await loadSource('scenario/guidedScenario.ts')
const empty = blankDraft('frontend-contract-test')
const configured = {
  ...chooseModel(empty, registry.models.find((model) => model.model_id === 'bhattacharjee2004_dimensionless')), revision: 1,
  values: { ...chooseModel(empty, registry.models[0]).values,
    'model_inputs.bhattacharjee2004_dimensionless.eta_g': '0',
    'model_inputs.bhattacharjee2004_dimensionless.radiation_number': '0' },
}
console.log(JSON.stringify({
  empty: buildScenario(empty, registry),
  configured: buildScenario(configured, registry),
  concurrent: buildScenario({ ...configured, revision: 2, values: { ...configured.values, 'airflow.direction': 'concurrent' } }, registry),
}))
await cleanModules()
