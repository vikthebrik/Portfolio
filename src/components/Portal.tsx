import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'
import useStore, { type ViewId } from '../store/useStore'

// ── Types ─────────────────────────────────────────────────────────────────────
interface PortalProps {
  name: string
  viewId: ViewId
  position: [number, number, number]
  color: string
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Portal({ name, viewId, position, color }: PortalProps) {
  const { setView, isTransitioning } = useStore()
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)
  const targetScale = useRef(1)

  // ── Per-frame animation ──────────────────────────────────────────────────
  useFrame((_, delta) => {
    const goal = hovered ? 1.15 : 1
    targetScale.current = THREE.MathUtils.damp(targetScale.current, goal, 8, delta)

    if (meshRef.current) {
      meshRef.current.scale.setScalar(targetScale.current)
      meshRef.current.rotation.y += delta * (hovered ? 0.8 : 0.2)
    }

    // Orbit ring rotates independently
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.35
      ringRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.2
    }
  })

  const handleClick = () => {
    if (!isTransitioning) setView(viewId)
  }

  return (
    <group position={position}>
      {/* Core orb */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
        castShadow
      >
        <icosahedronGeometry args={[0.65, 3]} />
        <MeshDistortMaterial
          color={color}
          distort={hovered ? 0.5 : 0.22}
          speed={hovered ? 5 : 2}
          roughness={0.1}
          metalness={0.7}
          clearcoat={1}
          clearcoatRoughness={0.05}
          emissive={color}
          emissiveIntensity={hovered ? 0.9 : 0.28}
        />
      </mesh>

      {/* Orbit ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.95, 0.025, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.9 : 0.35} />
      </mesh>

      {/* Label */}
      <Text
        position={[0, -1.15, 0]}
        fontSize={0.18}
        color={hovered ? '#ffffff' : '#888888'}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.12}
      >
        {name.toUpperCase()}
      </Text>

      {/* Glow halo (point light activated on hover) */}
      {hovered && (
        <pointLight color={color} intensity={5} distance={5} decay={2} />
      )}
    </group>
  )
}
