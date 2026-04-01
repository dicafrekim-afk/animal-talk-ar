import { Canvas } from '@react-three/fiber'
import { useState, useEffect, useRef, useCallback } from 'react'
import SpeechBubble from './SpeechBubble'
import AnalysisHUD from './AnalysisHUD'
import { useCamera } from '../hooks/useCamera'
import { useCatAnalysis } from '../hooks/useCatAnalysis'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { fileToBase64 } from '../utils/imageUtils'
import styles from './ARScene.module.css'

/**
 * ARScene - 카메라 배경 위에 Three.js Canvas를 오버레이하는 AR 씬
 * 레이어 구조: [카메라 video / 업로드 이미지(배경)] → [Three.js Canvas] → [UI HUD]
 */
export default function ARScene() {
  const { videoRef, isReady, error: cameraError } = useCamera()
  const { analysis, isAnalyzing, error: analysisError, analyze, analyzeImage, clearAnalysis, micReady, micError } = useCatAnalysis(videoRef)
  const { isListening, isSupported, start, stop } = useSpeechRecognition(analyze)
  const [voiceCommandActive, setVoiceCommandActive] = useState(true)
  // 업로드 이미지는 data URL로 저장 (blob URL은 StrictMode 이중 마운트에서 무효화될 수 있음)
  const [uploadedDataUrl, setUploadedDataUrl] = useState(null)
  const fileInputRef = useRef(null)

  const isUploadMode = uploadedDataUrl !== null
  const speechMessage = analysis?.speech_bubble

  useEffect(() => {
    if (isReady && voiceCommandActive && !isUploadMode) {
      start()
    } else {
      stop()
    }
  }, [isReady, voiceCommandActive, isUploadMode, start, stop])

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    clearAnalysis()
    e.target.value = ''

    // FileReader로 data URL 읽기 — 안정적이고 StrictMode에 안전
    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target.result // "data:image/jpeg;base64,..."
      setUploadedDataUrl(dataUrl)

      const base64 = dataUrl.split(',')[1]
      try {
        await analyzeImage(base64)
      } catch {
        // analyzeImage 내부에서 에러 처리
      }
    }
    reader.readAsDataURL(file)
  }, [analyzeImage, clearAnalysis])

  const handleBackToCamera = useCallback(() => {
    setUploadedDataUrl(null)
    clearAnalysis()
  }, [clearAnalysis])

  // 업로드 모드일 때 컨테이너에 background-image로 사진 표시
  // <img> 요소 대신 CSS background를 사용해 렌더링 문제 우회
  const containerStyle = isUploadMode
    ? {
        backgroundImage: `url("${uploadedDataUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {}

  return (
    <div className={styles.arContainer} style={containerStyle}>
      {/* 레이어 1: 카메라 피드 (업로드 모드에서는 숨김) */}
      <video
        ref={videoRef}
        className={styles.cameraBackground}
        style={{ display: isUploadMode ? 'none' : 'block' }}
        autoPlay
        playsInline
        muted
      />

      {/* 카메라 에러 */}
      {cameraError && !isUploadMode && (
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

        {/* 업로드 모드 뱃지 */}
        {isUploadMode && !isAnalyzing && (
          <div className={styles.uploadModeBadge}>📷 사진 분석 모드</div>
        )}

        {/* 행동 분석 HUD */}
        <AnalysisHUD analysis={analysis} onClose={clearAnalysis} />

        {/* API 에러 */}
        {analysisError && (
          <div className={styles.noCatBadge} style={{ borderColor: '#ff4d4d', color: '#ff9999' }}>
            오류: {analysisError}
          </div>
        )}

        {/* 분석 중 표시 */}
        {isAnalyzing && (
          <div className={styles.analyzingBadge}>
            {isUploadMode ? '🖼️ 사진 분석 중...' : micReady ? '👂 소리 듣고 분석 중...' : '📷 분석 중...'}
          </div>
        )}

        {/* 마이크 오류 안내 (첫 로드 시만 노출) */}
        {micError && !analysis && !isAnalyzing && !isUploadMode && (
          <div className={styles.micErrorBadge}>🎙️ 마이크 없이 이미지만 분석해요</div>
        )}

        {isListening && (
          <div className={styles.analyzingBadge} style={{ borderColor: '#4dff4d', color: '#99ff99' }}>음성 명령 대기 중...</div>
        )}

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenFileInput}
          onChange={handleFileChange}
        />

        <div className={styles.buttonContainer}>
          {/* 카메라 모드 버튼들 */}
          {!isUploadMode && (
            <>
              {isSupported && (
                <button
                  className={`${styles.analyzeBtn} ${voiceCommandActive ? styles.active : ''}`}
                  onClick={() => setVoiceCommandActive(prev => !prev)}
                >
                  {voiceCommandActive ? '음성명령 끄기' : '음성명령 켜기'}
                </button>
              )}
              <button
                className={styles.analyzeBtn}
                onClick={analyze}
                disabled={isAnalyzing || !isReady}
              >
                {isAnalyzing ? '분석 중...' : !isReady ? '카메라 준비 중...' : '쿤이/민이 말 걸기'}
              </button>
              <button
                className={styles.analyzeBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
              >
                사진 업로드
              </button>
            </>
          )}

          {/* 업로드 모드 버튼들 */}
          {isUploadMode && (
            <>
              <button
                className={styles.analyzeBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? '분석 중...' : '다른 사진 선택'}
              </button>
              <button
                className={styles.analyzeBtn}
                onClick={handleBackToCamera}
                disabled={isAnalyzing}
              >
                카메라로 돌아가기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
