import { useCallback } from 'react'
import { analyzeFrame } from '../services/geminiService'
import { captureVideoFrame } from '../utils/imageUtils'
import styles from './GeminiAnalyzer.module.css'

/**
 * GeminiAnalyzer - 카메라 프레임 캡처 → Gemini 1.5 Pro 분석 버튼
 * 결과는 CatAnalysis 객체로 onResult에 전달
 */
export default function GeminiAnalyzer({ videoRef, onResult, isAnalyzing, setIsAnalyzing }) {
  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || isAnalyzing) return

    setIsAnalyzing(true)
    try {
      const base64Image = captureVideoFrame(videoRef.current)
      const analysis = await analyzeFrame(base64Image)
      onResult(analysis)
    } catch (err) {
      console.error('Gemini 분석 실패:', err)
      onResult({
        cat_detected: false,
        speech_bubble: '분석 중 오류가 발생했어요 😿',
        confidence_score: 0,
      })
    } finally {
      setIsAnalyzing(false)
    }
  }, [videoRef, isAnalyzing, setIsAnalyzing, onResult])

  return (
    <button
      className={styles.analyzeBtn}
      onClick={captureAndAnalyze}
      disabled={isAnalyzing}
    >
      {isAnalyzing ? '분석 중...' : '쿤이/민이 말 걸기'}
    </button>
  )
}
