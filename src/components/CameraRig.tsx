import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import useStore, { type ViewId } from '../store/useStore'

// ── Camera waypoints keyed by view ────────────────────────────────────────────
// position: where the camera travels to
// lookAt:   what it looks at while there
const WAYPOINTS: Record<ViewId, { position: THREE.Vector3; lookAt: THREE.Vector3 }> = {
  HUB: {
    position: new THREE.Vector3(0, 3.5, 9),
    lookAt:   new THREE.Vector3(0, 0, 0),
  },
  PORTAL_TECH: {
    position: new THREE.Vector3(4.5, 1.2, 5),
    lookAt:   new THREE.Vector3(5, 0, 0),
  },
  PORTAL_RESEARCH: {
    position: new THREE.Vector3(-4.5, 1.2, 5),
    lookAt:   new THREE.Vector3(-5, 0, 0),
  },
  PORTAL_DRONE: {
    position: new THREE.Vector3(0, 1.2, -5.5),
    lookAt:   new THREE.Vector3(0, 0, -8),
  },
  PORTAL_DESIGN: {
    position: new THREE.Vector3(0, 5.5, 3),
    lookAt:   new THREE.Vector3(0, 3, 0),
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const _targetPos  = new THREE.Vector3()
const _targetLook = new THREE.Vector3()
const _currentLook = new THREE.Vector3()

// ── Component ─────────────────────────────────────────────────────────────────
export default function CameraRig() {
  const { camera } = useThree()
  const { currentView } = useStore()

  // Pointer parallax offset (updated each move event via useFrame state)
  const parallax = useRef({ x: 0, y: 0 })
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0))

  // Listen to pointer at DOM level for parallax
  useFrame((state, delta) => {
    const waypoint = WAYPOINTS[currentView]

    // Apply subtle pointer parallax on top of the waypoint position
    const px = state.pointer.x
    const py = state.pointer.y
    parallax.current.x = THREE.MathUtils.damp(parallax.current.x, px * 0.4, 4, delta)
    parallax.current.y = THREE.MathUtils.damp(parallax.current.y, py * 0.25, 4, delta)

    _targetPos.copy(waypoint.position).add(
      new THREE.Vector3(parallax.current.x, parallax.current.y, 0)
    )

    // Smoothly interpolate camera position (buttery damp)
    camera.position.lerp(_targetPos, 1 - Math.pow(0.001, delta))

    // Smoothly interpolate lookAt target
    _currentLook.copy(currentLookAt.current)
    _targetLook.copy(waypoint.lookAt)
    currentLookAt.current.lerp(_targetLook, 1 - Math.pow(0.001, delta))

    camera.lookAt(currentLookAt.current)
    camera.updateProjectionMatrix()
  })

  return null
}
