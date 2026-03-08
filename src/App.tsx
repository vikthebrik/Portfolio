import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { EffectComposer, Noise, Vignette, Bloom, DepthOfField } from '@react-three/postprocessing'
import * as THREE from 'three'
import CameraRig from './components/CameraRig'
import Portal from './components/Portal'
import UIManager from './ui/UIManager'
import useStore from './store/useStore'

// ── Hub core — warm physical material ─────────────────────────────────────────
function HubCore() {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.18
  })

  return (
    <mesh ref={meshRef} castShadow>
      <sphereGeometry args={[0.4, 64, 64]} />
      <meshPhysicalMaterial
        color="#ff8c42"
        emissive="#ff5500"
        emissiveIntensity={0.4}
        roughness={0.25}
        metalness={0.6}
        clearcoat={1}
        clearcoatRoughness={0.1}
      />
    </mesh>
  )
}

// ── Ground plane ──────────────────────────────────────────────────────────────
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshPhysicalMaterial
        color="#1a0f05"
        roughness={0.95}
        metalness={0.05}
        clearcoat={0.15}
      />
    </mesh>
  )
}

// ── Post-processing — analog feel ─────────────────────────────────────────────
function PostFX() {
  const { isTransitioning } = useStore()
  // focusDistance lerps toward a tighter DOF during transition
  const focusDist = useRef(0.012)

  useFrame((_, delta) => {
    const target = isTransitioning ? 0.025 : 0.01
    focusDist.current = THREE.MathUtils.damp(focusDist.current, target, 3, delta)
  })

  return (
    <EffectComposer>
      <DepthOfField focusDistance={0.012} focalLength={0.06} bokehScale={3} height={700} />
      <Bloom luminanceThreshold={0.55} luminanceSmoothing={0.9} intensity={0.6} />
      <Noise opacity={0.05} />
      <Vignette eskil={false} offset={0.3} darkness={0.7} />
    </EffectComposer>
  )
}

// ── Full scene ────────────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      {/* Ambient warm fill */}
      <ambientLight color="#ff9966" intensity={0.35} />

      {/* Key light — warm golden */}
      <directionalLight
        color="#ffd580"
        position={[8, 14, 6]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />

      {/* Hub warm point light */}
      <pointLight color="#ff6600" position={[0, 1.5, 0]} intensity={8} distance={10} decay={2} />

      {/* Rim / fill */}
      <pointLight color="#aa44ff" position={[-8, 4, -4]} intensity={3} distance={18} decay={2} />

      <Environment preset="sunset" />

      <HubCore />
      <Ground />

      <Portal name="Tech"     viewId="PORTAL_TECH"     position={[ 5,  0,  0]} color="#c084fc" />
      <Portal name="Research" viewId="PORTAL_RESEARCH" position={[-5,  0,  0]} color="#fb923c" />
      <Portal name="Drone"    viewId="PORTAL_DRONE"    position={[ 0,  0, -8]} color="#34d399" />
      <Portal name="Design"   viewId="PORTAL_DESIGN"   position={[ 0,  3,  0]} color="#fbbf24" />

      <CameraRig />
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0d0703' }}>
      <Canvas
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        shadows
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 3.5, 9], fov: 55, near: 0.1, far: 200 }}
      >
        <color attach="background" args={['#0d0703']} />
        <fog attach="fog" args={['#1a0805', 18, 55]} />

        <Suspense fallback={null}>
          <Scene />
          <PostFX />
        </Suspense>
      </Canvas>

      <UIManager />
    </div>
  )
}
