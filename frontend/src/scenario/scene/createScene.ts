import * as THREE from 'three'
import { createFirePass } from '../../playback/fire/volume'
import { createPlaybackIllustration } from '../../playback/playbackObjects'
import type { PlaybackFrame } from '../../playback/types'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { SceneDescription } from '../guidedScenario'
import { createIllustration, disposeScene } from './sceneObjects'

export type SceneAction = 'reset' | 'orbit' | 'zoomIn' | 'zoomOut'
export type SceneController = ReturnType<typeof createScene>

// Cohesive renderer lifecycle: allocate, respond to view-only controls, dispose on unmount.
export function createScene(host: HTMLElement, description: SceneDescription, onLost: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, description.mode === 'steady_playback' ? 1.5 : 2))
  renderer.setClearColor('#07101e', 1)
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50)
  if (description.mode === 'steady_playback') camera.position.set(.9, 1.9, 4.8)
  else camera.position.set(6, 4, 7)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, description.mode === 'steady_playback' ? 0 : 0.5, 0)
  controls.minDistance = 4; controls.maxDistance = 16; controls.enablePan = false
  controls.update(); controls.saveState()
  scene.add(new THREE.HemisphereLight('#c7e4ff', '#273141', 2.5))
  const light = new THREE.DirectionalLight('#ffffff', 3)
  light.position.set(3, 5, 2); scene.add(light)
  const playbackIllustration = description.mode === 'steady_playback' ? createPlaybackIllustration(description.flow) : null
  const illustration = playbackIllustration ?? createIllustration(description)
  const { assembly, flame } = illustration
  scene.add(assembly)
  const cageGeometry = new THREE.BoxGeometry(7, 3.7, 4.5)
  const cage = new THREE.LineSegments(new THREE.EdgesGeometry(cageGeometry), new THREE.LineBasicMaterial({ color: '#20364d', transparent: true, opacity: 0.5 }))
  cageGeometry.dispose(); cage.position.y = 0.6; if (!playbackIllustration) scene.add(cage)
  else { cage.geometry.dispose(); cage.material.dispose() }
  const firePass = playbackIllustration ? createFirePass(renderer, playbackIllustration.volume) : null
  const render = () => firePass ? firePass.render(scene, camera) : renderer.render(scene, camera)
  controls.addEventListener('change', render)
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect()
    camera.aspect = Math.max(width, 1) / Math.max(height, 1); camera.updateProjectionMatrix()
    renderer.setSize(width, height); render()
  })
  resize.observe(host)
  const lost = (event: Event) => { event.preventDefault(); onLost() }
  renderer.domElement.addEventListener('webglcontextlost', lost)
  return {
    presentation: (turned: boolean, showFlame: boolean) => {
      assembly.rotation.z = turned ? Math.PI / 2 : 0; flame.visible = showFlame; render()
    },
    playback: (frame: PlaybackFrame, extentMm: number) => {
      if (playbackIllustration) { playbackIllustration.update(frame, extentMm); render() }
    },
    action: (action: SceneAction) => cameraAction(action, controls, camera),
    dispose: () => {
      resize.disconnect(); controls.removeEventListener('change', render); controls.dispose()
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      firePass?.dispose(); disposeScene(scene); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
    },
  }
}
function cameraAction(action: SceneAction, controls: OrbitControls, camera: THREE.PerspectiveCamera) {
  if (action === 'reset') { controls.reset(); return }
  const offset = camera.position.clone().sub(controls.target)
  if (action === 'orbit') offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 8)
  else offset.multiplyScalar(action === 'zoomIn' ? 0.85 : 1.15)
  offset.clampLength(controls.minDistance, controls.maxDistance)
  camera.position.copy(controls.target).add(offset); controls.update()
}
