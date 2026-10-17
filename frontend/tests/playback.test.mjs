import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { cleanModules, loadSource } from './loadScenarioModules.mjs'
const { sampleTrajectory, advanceTime } = await loadSource('playback/kinematics.ts')
const { createPlaybackIllustration } = await loadSource('playback/playbackObjects.ts')
const { disposeScene } = await loadSource('scenario/scene/sceneObjects.ts')
after(cleanModules)
const refs = JSON.parse(await readFile(new URL('../../data/scientific_reference_results.json', import.meta.url)))
const spec = refs.playback_cases.find((item) => item.case_id === 'saffire2-s5')
const speed = refs.results.find((row) => row.id === spec.vf_reference_id).value
const length = refs.results.find((row) => row.id === spec.lp_reference_id).value * 10
const trajectory = { kind: 'steady_reference_kinematics', duration_s: length / speed,
  anchors: [{ x_front_mm: length, l_p_mm: length }, { x_front_mm: length * 2, l_p_mm: length }] }
test('Published steady anchors interpolate derived motion with exact unit conversion and bounded time', () => {
  const middle = sampleTrajectory(trajectory, 10)
  assert.equal(middle.x_front_mm, length + speed * 10)
  assert.equal(middle.l_p_mm, length)
  assert.equal(middle.x_base_mm, middle.x_front_mm - length)
  assert.equal(sampleTrajectory(trajectory, -10).x_base_mm, 0)
  assert.equal(sampleTrajectory(trajectory, 999).x_front_mm, length * 2)
  assert.throws(() => sampleTrajectory(trajectory, NaN))
  assert.throws(() => sampleTrajectory({ ...trajectory, kind: 'measured' }, 0))
  assert.equal(advanceTime(2, 500, 10), 2.5)
  assert.equal(advanceTime(9, 5000, 10), 10)
  assert.equal(advanceTime(2, -500, 10), 2)
})
test('The GPU volume follows only longitudinal data; surface thresholds track the same frame', () => {
  const { assembly, volume, update } = createPlaybackIllustration('concurrent')
  const front = assembly.getObjectByName('derived-front')
  const base = assembly.getObjectByName('derived-base')
  const surface = assembly.getObjectByName('virgin-active-char-surface')
  const extent = length * 2
  update(sampleTrajectory(trajectory, 0), extent)
  const height = volume.scale.y, width = volume.scale.z
  assert.equal(front.position.x, 0); assert.equal(base.position.x, -2)
  assert.equal(surface.material.uniforms.uBase.value, -2)
  update(sampleTrajectory(trajectory, trajectory.duration_s), extent)
  assert.equal(front.position.x, 2); assert.equal(base.position.x, 0)
  assert.equal(volume.scale.x, front.position.x - base.position.x)
  assert.equal(volume.position.x, (front.position.x + base.position.x) / 2)
  assert.equal(volume.material.uniforms.uTime.value, trajectory.duration_s)
  assert.equal(surface.material.uniforms.uBase.value, base.position.x)
  assert.equal(surface.material.uniforms.uFront.value, front.position.x)
  assert.equal(volume.scale.y, height); assert.equal(volume.scale.z, width)
  assert.equal(volume.material.wireframe, false)
  assert.equal(volume.material.depthWrite, false)
  // A changed length changes support, without inventing a height or temperature response.
  update({ time_s: 5, x_front_mm: 60, x_base_mm: 40, l_p_mm: 20 }, 100)
  assert.equal(volume.scale.x, .8); assert.equal(volume.scale.y, height)
  assert.equal(volume.material.uniforms.uTime.value, 5)
  update(sampleTrajectory(trajectory, 0), extent)
  assert.equal(volume.material.uniforms.uTime.value, 0)
  disposeScene(assembly)
})
test('Airflow direction controls advection and arrows; missing direction never becomes opposed flow', () => {
  const forward = createPlaybackIllustration('concurrent')
  const reverse = createPlaybackIllustration('opposed')
  const absent = createPlaybackIllustration('unspecified')
  assert.equal(forward.volume.material.uniforms.uFlow.value, 1)
  assert.equal(reverse.volume.material.uniforms.uFlow.value, -1)
  assert.equal(absent.volume.material.uniforms.uFlow.value, 0)
  assert.notDeepEqual(forward.assembly.getObjectByName('evidence-airflow-direction').quaternion.toArray(),
    reverse.assembly.getObjectByName('evidence-airflow-direction').quaternion.toArray())
  assert.equal(absent.assembly.getObjectByName('evidence-airflow-direction'), undefined)
  for (const scene of [forward, reverse, absent]) disposeScene(scene.assembly)
})
test('Playback rates change clock speed only, with bounded endpoint and no invented motion on pause', () => {
  for (const rate of [.25, .5, 1, 2]) {
    assert.equal(advanceTime(0, 1000, 10, rate), rate)
    assert.equal(advanceTime(9.9, 2000, 10, rate), 10)
    assert.equal(advanceTime(3, 0, 10, rate), 3)
    assert.ok(Math.abs(sampleTrajectory(trajectory, 3).x_front_mm - (length + speed * 3)) < 1e-10)
  }
})
