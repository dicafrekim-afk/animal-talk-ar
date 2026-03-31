import { useRef, useCallback, useState, useEffect } from 'react'

/**
 * 마이크 오디오를 캡처해 base64로 반환하는 훅.
 * 권한 거부 시 null을 반환하며 앱은 이미지 단독 분석으로 graceful degradation.
 */
export function useAudioCapture() {
  const streamRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)

  const init = useCallback(async () => {
    if (streamRef.current) return // 이미 초기화됨
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      setIsReady(true)
    } catch (err) {
      // 권한 거부 or 마이크 없음 → 이미지만으로 분석 계속
      setError(err.message)
    }
  }, [])

  // 컴포넌트 언마운트 시 스트림 정리
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  /**
   * durationMs 동안 오디오를 녹음해 { base64, mimeType } 반환.
   * 마이크 없거나 오류 시 null 반환.
   * @param {number} durationMs
   * @returns {Promise<{base64: string, mimeType: string} | null>}
   */
  const capture = useCallback((durationMs = 2000) => {
    if (!streamRef.current) return Promise.resolve(null)

    const mimeType = getSupportedMimeType()
    if (!mimeType) return Promise.resolve(null)

    return new Promise((resolve) => {
      const recorder = new MediaRecorder(streamRef.current, { mimeType })
      const chunks = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        blobToBase64(blob)
          .then(base64 => resolve({ base64, mimeType: blob.type }))
          .catch(() => resolve(null))
      }
      recorder.onerror = () => resolve(null)

      recorder.start()
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, durationMs)
    })
  }, [])

  return { isReady, error, init, capture }
}

/** 브라우저가 지원하는 오디오 MIME 타입 중 첫 번째 반환 */
function getSupportedMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ]
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? null
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
