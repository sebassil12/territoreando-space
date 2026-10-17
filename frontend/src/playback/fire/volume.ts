import * as THREE from 'three'
import { fireFragment, surfaceFragment, vertexShader } from './shaders'

export function createFireVolume() {
  const material = new THREE.ShaderMaterial({
    vertexShader, fragmentShader: fireFragment, transparent: true,
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: { uTime: { value: 0 }, uFlow: { value: 1 }, uEye: { value: new THREE.Vector3() },
      uClip: { value: new THREE.Matrix4() }, uResolution: { value: new THREE.Vector2(1, 1) },
      uBackground: { value: null }, uDepth: { value: null } },
  })
  // The box is only a ray-march bound. Its faces and edges are never shaded as a flame.
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
  mesh.name = 'procedural-fire-volume'; mesh.renderOrder = 2
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    mesh.worldToLocal(material.uniforms.uEye.value.copy(camera.position))
    material.uniforms.uClip.value.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(mesh.matrixWorld)
  }
  return mesh
}
export function createFuelSurface() {
  const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader: surfaceFragment,
    uniforms: { uFront: { value: 0 }, uBase: { value: -2 }, uTime: { value: 0 } },
  })
  const sample = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
  sample.name = 'virgin-active-char-surface'
  sample.scale.set(4, .045, 1.18)
  return sample
}
// One reduced-resolution background pass; no particle objects or postprocessing framework.
export function createFirePass(renderer: THREE.WebGLRenderer, volume: ReturnType<typeof createFireVolume>) {
  const target = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1) })
  const size = new THREE.Vector2()
  volume.material.uniforms.uBackground.value = target.texture
  volume.material.uniforms.uDepth.value = target.depthTexture
  return {
    render: (scene: THREE.Scene, camera: THREE.Camera) => {
      renderer.getDrawingBufferSize(size)
      const width = Math.max(1, Math.floor(size.x * .65)), height = Math.max(1, Math.floor(size.y * .65))
      if (target.width !== width || target.height !== height) target.setSize(width, height)
      volume.material.uniforms.uResolution.value.copy(size)
      const visible = volume.visible
      volume.visible = false; renderer.setRenderTarget(target); renderer.render(scene, camera)
      volume.visible = visible; renderer.setRenderTarget(null); renderer.render(scene, camera)
    },
    dispose: () => { target.dispose(); target.depthTexture?.dispose() },
  }
}
