import { useState, useCallback, useRef } from 'react'
import { analyzeFrame } from '../services/geminiService'
import { captureSharpestFrame } from '../utils/imageUtils'

/**
 * 고양이 분석 상태와 로직을 캡슐화하는 커스텀 훅
 * ARScene, GeminiAnalyzer 간 props 드릴링을 제거
 */
export function useCatAnalysis(videoRef) {
  const [analysis, setAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)   // 진행 중인 요청 취소용
  const prevAnalysisRef = useRef(null) // 스무딩용 이전 결과

  const CONFIDENCE_THRESHOLD = 0.5 // 이 미만이면 이전 결과 유지

  const analyze = useCallback(async () => {
    if (!videoRef.current || isAnalyzing) return

    // 이전 요청 취소
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setIsAnalyzing(true)
    setError(null)

    try {
      // 3프레임 중 가장 선명한 프레임 사용
      const base64 = await captureSharpestFrame(videoRef.current)
      const result = await analyzeFrame(base64, abortRef.current.signal)

      // confidence가 낮고 이전 결과가 있으면 이전 결과 유지 (튐 방지)
      if (result.cat_detected && result.confidence_score < CONFIDENCE_THRESHOLD && prevAnalysisRef.current) {
        setAnalysis(prevAnalysisRef.current)
      } else {
        prevAnalysisRef.current = result
        setAnalysis(result)
      }
    } catch (err) {
      if (err.name === 'AbortError') return // 의도적 취소는 무시
      console.error('분석 실패:', err)
      setError(err.message)
    } finally {
      setIsAnalyzing(false)
    }
  }, [videoRef, isAnalyzing])

  const clearAnalysis = useCallback(() => {
    setAnalysis(null)
    setError(null)
  }, [])

  return { analysis, isAnalyzing, error, analyze, clearAnalysis }
}
