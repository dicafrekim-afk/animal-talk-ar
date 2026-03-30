import { useState, useEffect, useRef } from 'react'

const CAMERA_ERRORS = {
  NotAllowedError: '카메라 접근 권한이 거부됐어요. 브라우저 설정에서 허용해주세요.',
  NotFoundError: '카메라를 찾을 수 없어요. 장치를 확인해주세요.',
  NotReadableError: '카메라가 다른 앱에서 사용 중이에요.',
  OverconstrainedError: '요청한 카메라 설정을 지원하지 않아요.',
  SecurityError: 'HTTPS 환경이 필요해요.',
}

/**
 * 카메라 스트림 초기화 및 에러 처리 훅
 */
export function useCamera() {
  const videoRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let stream = null

    async function initCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setIsReady(true)
        }
      } catch (err) {
        const message = CAMERA_ERRORS[err.name] ?? `카메라 오류: ${err.message}`
        setError(message)
      }
    }

    initCamera()

    return () => {
      stream?.getTracks().forEach(t => t.stop())
      setIsReady(false)
    }
  }, [])

  return { videoRef, isReady, error }
}
