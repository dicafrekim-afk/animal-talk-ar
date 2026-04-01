import { Canvas } from '@react-three/fiber'
import { useState, useEffect, useRef, useCallback } from 'react'
import SpeechBubble from './SpeechBubble'
import AnalysisHUD from './AnalysisHUD'
import { useCamera } from '../hooks/useCamera'
import { useCatAnalysis } from '../hooks/useCatAnalysis'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { fileToBase64 } from '../utils/imageUtils'
import styles from './ARScene.module.css'

const IMG_STYLE = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  zIndex: 0,
}

/**
 * ARScene - 카메라 배경 위에 Three.js Canvas를 오버레이하는 AR 씬
 * 레이어 구조: [카메라 video / 업로드 이미지] → [Three.js Canvas] → [UI HUD]
 */
export default function ARScene() {
  const { videoRef, isReady, error: cameraError } = useCamera()
  const { analysis, isAnalyzing, error: analysisError, analyze, analyzeImage, clearAnalysis, micReady, micError } = useCatAnalysis(videoRef)
  const { isListening, isSupported, start, stop } = useSpeechRecognition(analyze)
  const [voiceCommandActive, setVoiceCommandActive] = useState(true)
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null)
  const fileInputRef = useRef(null)
  const objectUrlRef = useRef(null)

  const isUploadMode = uploadedImageUrl !== null
  const speechMessage = analysis?.speech_bubble

  useEffect(() => {
    if (isReady && voiceCommandActive && !isUploadMode) {
      start()
    } else {
      stop()
    }
  }, [isReady, voiceCommandActive, isUploadMode, start, stop])

  // 컴포넌트 언마운트 시 object URL 정리
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    clearAnalysis()

    // 이전 object URL 해제
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }

    // createObjectURL로 즉시 표시 (빠르고 메모리 효율적)
    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setUploadedImageUrl(objectUrl)

    // base64는 AI 분석용으로만 별도 변환
    try {
      const base64 = await fileToBase64(file)
      await analyzeImage(base64)
    } catch {
      // analyzeImage 내부에서 에러 처리
    }

    e.target.value = ''
  }, [analyzeImage, clearAnalysis])

  const handleBackToCamera = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setUploadedImageUrl(null)
    clearAnalysis()
  }, [clearAnalysis])

  return (
    <div className={styles.arContainer}>
      {/* 레이어 1: 카메라 피드 또는 업로드 이미지 */}
      <video
        ref={videoRef}
        className={styles.cameraBackground}
        style={{ display: isUploadMode ? 'none' : 'block' }}
        autoPlay
        playsInline
        muted
      />
      {isUploadMode && (
        <img
          src={uploadedImageUrl}
          style={IMG_STYLE}
          alt="업로드된 사진"
        />
      )}

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
