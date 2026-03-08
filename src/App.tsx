import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import CameraRig from './components/CameraRig'
import Portal from './components/Portal'
import useStore from './store/useStore'

// ── Hub centre element ────────────────────────────────────────────────────────
function HubCore() {
  return (
    <mesh castShadow>
      <sphereGeometry args={[0.4, 32, 32]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#aaaaff"
        emissiveIntensity={0.5}
        roughness={0.1}
        metalness={1}
      />
    </mesh>
  )
}

// ── Full scene ────────────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <Environment preset="city" />

      <HubCore />

      <Portal name="Tech"     viewId="PORTAL_TECH"     position={[ 5,  0,  0]} color="#6c63ff" />
      <Portal name="Research" viewId="PORTAL_RESEARCH" position={[-5,  0,  0]} color="#ff6584" />
      <Portal name="Drone"    viewId="PORTAL_DRONE"    position={[ 0,  0, -8]} color="#4ecdc4" />
      <Portal name="Design"   viewId="PORTAL_DESIGN"   position={[ 0,  3,  0]} color="#ffd93d" />

      <CameraRig />
    </>
  )
}

// ── "Back to Hub" overlay ─────────────────────────────────────────────────────
function UIOverlay() {
  const { currentView, setView } = useStore()
  if (currentView === 'HUB') return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
      }}
    >
      <button
        onClick={() => setView('HUB')}
        style={{
          background: 'rgba(10, 10, 10, 0.85)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#f0f0f0',
          padding: '0.65rem 2rem',
          fontSize: '0.75rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          borderRadius: '2px',
          transition: 'border-color 0.3s, color 0.3s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#6c63ff'
          e.currentTarget.style.color = '#6c63ff'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
          e.currentTarget.style.color = '#f0f0f0'
        }}
      >
        ← Back to Hub
      </button>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505' }}>
      <Canvas
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        shadows
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 3.5, 9], fov: 55, near: 0.1, far: 200 }}
      >
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 20, 60]} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      <UIOverlay />
    </div>
  )
}
