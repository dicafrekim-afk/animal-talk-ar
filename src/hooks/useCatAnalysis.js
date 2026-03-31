import { useState, useCallback, useRef, useEffect } from 'react'
import { analyzeFrame } from '../services/geminiService'
import { captureSharpestFrame } from '../utils/imageUtils'
import { useAudioCapture } from './useAudioCapture'

/**
 * 고양이 분석 상태와 로직을 캡슐화하는 커스텀 훅
 * 이미지 + 오디오를 동시에 캡처해 Gemini로 전송
 */
export function useCatAnalysis(videoRef) {
  const [analysis, setAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)
  const prevAnalysisRef = useRef(null)

  const { isReady: micReady, error: micError, init: initMic, capture: captureAudio } = useAudioCapture()

  const CONFIDENCE_THRESHOLD = 0.5
  const AUDIO_DURATION_MS = 2500 // 2.5초 녹음 (야옹·골골송 포착에 충분)

  // 마이크 초기화 (카메라 준비 후 자동 요청)
  useEffect(() => {
    initMic()
  }, [initMic])

  const analyze = useCallback(async () => {
    if (!videoRef.current || isAnalyzing) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setIsAnalyzing(true)
    setError(null)

    try {
      // 이미지(3프레임 선별)와 오디오(2.5초)를 동시에 캡처
      const [base64, audioData] = await Promise.all([
        captureSharpestFrame(videoRef.current),
        captureAudio(AUDIO_DURATION_MS),
      ])

      if (abortRef.current.signal.aborted) return

      const result = await analyzeFrame(base64, abortRef.current.signal, audioData)

      if (result.cat_detected && result.confidence_score < CONFIDENCE_THRESHOLD && prevAnalysisRef.current) {
        setAnalysis(prevAnalysisRef.current)
      } else {
        prevAnalysisRef.current = result
        setAnalysis(result)
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('분석 실패:', err)
      setError(err.message)
    } finally {
      setIsAnalyzing(false)
    }
  }, [videoRef, isAnalyzing, captureAudio])

  const clearAnalysis = useCallback(() => {
    setAnalysis(null)
    setError(null)
  }, [])

  return { analysis, isAnalyzing, error, analyze, clearAnalysis, micReady, micError }
}
