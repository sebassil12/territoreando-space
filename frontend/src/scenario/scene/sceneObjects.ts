import * as THREE from 'three'
import type { SceneDescription } from '../guidedScenario'

// All coordinates, colors and sizes below are illustration units, never physical data.
export function createIllustration(description: SceneDescription) {
  const assembly = new THREE.Group()
  const sample = new THREE.Mesh(new THREE.BoxGeometry(4, description.shape === 'slab' ? 0.22 : 0.06, 1.3),
    new THREE.MeshStandardMaterial({ color: '#9cb9ce', metalness: 0.35, roughness: 0.6 }))
  sample.name = 'illustrative-fuel'
  assembly.add(sample)
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(sample.geometry), new THREE.LineBasicMaterial({ color: '#d4e7f5' }))
  assembly.add(edges)
  const flame = flameSymbol()
  assembly.add(flame)
  addFlowArrows(assembly, description.flow)
  assembly.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1.8, -0.5, 0.95), 3.6, '#e2e8f0', 0.25, 0.12))
  return { assembly, flame }
}
function flameSymbol() {
  const profile = [[0, 0], [0.34, 0.15], [0.56, 0.48], [0.4, 0.95], [0.16, 1.4], [0, 1.8]]
  const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 24)
  const flame = new THREE.Group()
  flame.name = 'fixed-illustrative-flame'
  flame.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#c084fc', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })))
  flame.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#c084fc', wireframe: true, transparent: true, opacity: 0.3, depthWrite: false })))
  flame.position.set(-0.4, 0.12, 0)
  flame.scale.set(1.3, 1, 0.65)
  return flame
}
function addFlowArrows(group: THREE.Group, flow: SceneDescription['flow']) {
  if (flow === 'unspecified') return
  const sign = flow === 'opposed' ? -1 : 1
  for (const z of [-1.25, 1.25]) {
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(sign, 0, 0), new THREE.Vector3(-sign * 2.1, 0.65, z), 4.2, '#38bdf8', 0.28, 0.16)
    arrow.name = 'declared-airflow-direction'
    group.add(arrow)
  }
}
export function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      geometries.add(object.geometry)
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
    }
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
}
