import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

/**
 * SpeechBubble - 네온 블루 스타일 3D 말풍선
 * 고양이 머리 위에 떠있는 느낌을 위해 부드럽게 흔들림(bobbing) 애니메이션 적용
 */
export default function SpeechBubble({ message = '냐옹~', position = [0, 1.5, 0] }) {
  const groupRef = useRef()
  const glowRef = useRef()

  // 네온 블루 색상 팔레트
  const NEON_BLUE = '#00bfff'
  const NEON_BLUE_DIM = '#0077aa'
  const BUBBLE_COLOR = '#001a2e'

  // 부드러운 위아래 떠다니는 애니메이션
  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.08
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.05

    // 글로우 펄스
    if (glowRef.current) {
      const pulse = 0.7 + Math.sin(t * 2) * 0.3
      glowRef.current.material.opacity = pulse * 0.15
    }
  })

  // 텍스트 길이에 따라 말풍선 너비 동적 조정
  const bubbleWidth = Math.max(2, Math.min(4, message.length * 0.18 + 1.2))
  const bubbleHeight = 0.7

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      {/* 글로우 레이어 (뒤쪽 큰 박스) */}
      <mesh ref={glowRef} position={[0, 0, -0.05]}>
        <boxGeometry args={[bubbleWidth + 0.3, bubbleHeight + 0.3, 0.05]} />
        <meshBasicMaterial color={NEON_BLUE} transparent opacity={0.15} />
      </mesh>

      {/* 말풍선 본체 */}
      <RoundedBox
        args={[bubbleWidth, bubbleHeight, 0.15]}
        radius={0.12}
        smoothness={4}
      >
        <meshStandardMaterial
          color={BUBBLE_COLOR}
          emissive={NEON_BLUE_DIM}
          emissiveIntensity={0.3}
          transparent
          opacity={0.88}
          metalness={0.2}
          roughness={0.3}
        />
      </RoundedBox>

      {/* 말풍선 테두리 (와이어프레임 효과) */}
      <RoundedBox
        args={[bubbleWidth + 0.02, bubbleHeight + 0.02, 0.12]}
        radius={0.12}
        smoothness={4}
      >
        <meshBasicMaterial
          color={NEON_BLUE}
          wireframe={false}
          transparent
          opacity={0.6}
          side={THREE.BackSide}
        />
      </RoundedBox>

      {/* 말풍선 꼬리 (아래 삼각형) */}
      <mesh position={[0, -bubbleHeight / 2 - 0.12, 0]}>
        <coneGeometry args={[0.12, 0.25, 4]} />
        <meshStandardMaterial
          color={BUBBLE_COLOR}
          emissive={NEON_BLUE_DIM}
          emissiveIntensity={0.3}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* 텍스트 */}
      <Text
        position={[0, 0, 0.1]}
        fontSize={0.18}
        color={NEON_BLUE}
        anchorX="center"
        anchorY="middle"
        maxWidth={bubbleWidth - 0.3}
        textAlign="center"
        outlineWidth={0.008}
        outlineColor="#003355"
      >
        {message}
      </Text>
    </group>
  )
}
