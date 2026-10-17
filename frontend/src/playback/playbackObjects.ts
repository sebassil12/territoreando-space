import * as THREE from 'three'
import type { PlaybackFrame } from './types'
import { createFireVolume, createFuelSurface } from './fire/volume'

// Art dimensions have no physical interpretation except the explicit longitudinal mm mapping.
export function createPlaybackIllustration(flow: 'concurrent' | 'opposed' | 'unspecified') {
  const assembly = new THREE.Group(), flame = new THREE.Group()
  const direction = flow === 'concurrent' ? 1 : flow === 'opposed' ? -1 : 0
  const surface = createFuelSurface(), volume = createFireVolume()
  const front = marker('derived-front', '#d8d2b5'), base = marker('derived-base', '#a16648')
  volume.material.uniforms.uFlow.value = direction
  flame.add(volume); assembly.add(surface, flame, front, base)
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(direction || 1, 0, 0), new THREE.Vector3(-1.8 * direction, -.2, .95), 3.6, '#77a8b8', .16, .08)
  arrow.name = 'evidence-airflow-direction'; if (direction) assembly.add(arrow)
  const update = (frame: PlaybackFrame, extentMm: number) => {
    if (!(extentMm > 0) || !Number.isFinite(extentMm)) return
    const scale = 4 / extentMm
    front.position.x = -2 + frame.x_front_mm * scale
    base.position.x = -2 + frame.x_base_mm * scale
    volume.position.x = (front.position.x + base.position.x) / 2
    volume.scale.set(frame.l_p_mm * scale, 1.35, 1.45)
    volume.material.uniforms.uTime.value = frame.time_s
    surface.material.uniforms.uFront.value = front.position.x
    surface.material.uniforms.uBase.value = base.position.x
    surface.material.uniforms.uTime.value = frame.time_s
  }
  return { assembly, flame, volume, update }
}
function marker(name: string, color: string) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(.008, .006, 1.2), new THREE.MeshBasicMaterial({ color }))
  mesh.name = name; mesh.position.y = .026
  return mesh
}
