import { Canvas } from '@react-three/fiber'
import { useState, useEffect } from 'react'
import SpeechBubble from './SpeechBubble'
import AnalysisHUD from './AnalysisHUD'
import { useCamera } from '../hooks/useCamera'
import { useCatAnalysis } from '../hooks/useCatAnalysis'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import styles from './ARScene.module.css'

/**
 * ARScene - 카메라 배경 위에 Three.js Canvas를 오버레이하는 AR 씬
 * 레이어 구조: [카메라 video] → [Three.js Canvas] → [UI HUD]
 */
export default function ARScene() {
  const { videoRef, isReady, error: cameraError } = useCamera()
  const { analysis, isAnalyzing, error: analysisError, analyze, clearAnalysis } = useCatAnalysis(videoRef)
  const { isListening, isSupported, start, stop } = useSpeechRecognition(analyze)
  const [voiceCommandActive, setVoiceCommandActive] = useState(true);

  const speechMessage = analysis?.cat_detected ? analysis.speech_bubble : null

  useEffect(() => {
    if (isReady && voiceCommandActive) {
      start();
    } else {
      stop();
    }
  }, [isReady, voiceCommandActive, start, stop]);


  return (
    <div className={styles.arContainer}>
      {/* 레이어 1: 카메라 피드 */}
      <video
        ref={videoRef}
        className={styles.cameraBackground}
        autoPlay
        playsInline
        muted
      />

      {/* 카메라 에러 */}
      {cameraError && (
        <div className={styles.errorOverlay}>
          <p>카메라를 사용할 수 없어요</p>
          <p className={styles.errorDetail}>{cameraError}</p>
        </div>
      )}

      {/* 레이어 2: Three.js AR Canvas (투명 오버레이) */}
      <Canvas
        className={styles.threeCanvas}
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00bfff" />
        {speechMessage && (
          <SpeechBubble message={speechMessage} position={[0, 1.5, 0]} />
        )}
      </Canvas>

      {/* 레이어 3: UI 오버레이 */}
      <div className={styles.uiOverlay}>
        <div className={styles.title}>Animal Talk AR</div>

        {/* 행동 분석 HUD */}
        <AnalysisHUD analysis={analysis} onClose={clearAnalysis} />

        {/* 고양이 미감지 메시지 */}
        {analysis && !analysis.cat_detected && (
          <div className={styles.noCatBadge}>{analysis.speech_bubble}</div>
        )}

        {/* API 에러 */}
        {analysisError && (
          <div className={styles.noCatBadge} style={{ borderColor: '#ff4d4d', color: '#ff9999' }}>
            오류: {analysisError}
          </div>
        )}

        {/* 분석 중 표시 */}
        {isAnalyzing && (
          <div className={styles.analyzingBadge}>쿤이/민이 분석 중...</div>
        )}

        {isListening && (
            <div className={styles.analyzingBadge} style={{borderColor: '#4dff4d', color: '#99ff99'}}>음성 명령 대기 중...</div>
        )}

        <div className={styles.buttonContainer}>
          {isSupported && (
            <button
              className={`${styles.analyzeBtn} ${voiceCommandActive ? styles.active : ''}`}
              onClick={() => setVoiceCommandActive(prev => !prev)}
            >
              {voiceCommandActive ? '음성명령 끄기' : '음성명령 켜기'}
            </button>
          )}
          {/* 촬영 버튼 */}
          <button
            className={styles.analyzeBtn}
            onClick={analyze}
            disabled={isAnalyzing || !isReady}
          >
            {isAnalyzing ? '분석 중...' : !isReady ? '카메라 준비 중...' : '쿤이/민이 말 걸기'}
          </button>
        </div>
      </div>
    </div>
  )
}
