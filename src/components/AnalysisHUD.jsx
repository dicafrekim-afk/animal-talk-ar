import styles from './AnalysisHUD.module.css'

const EMOTION_ICON = {
  '안정': '😌',
  '흥분·사냥': '😼',
  '경계': '🐱',
  '두려움': '😿',
  '호기심': '🐈',
}

/**
 * AnalysisHUD - 카메라 화면 위에 표시되는 고양이 행동 분석 결과 패널
 */
export default function AnalysisHUD({ analysis, onClose }) {
  if (!analysis || !analysis.cat_detected) return null

  const {
    pupil_state,
    ear_position,
    body_posture,
    whisker_direction,
    emotion,
    confidence_score,
  } = analysis

  const icon = EMOTION_ICON[emotion] ?? '🐾'
  const confidencePct = Math.round((confidence_score ?? 0) * 100)

  return (
    <div className={styles.hud}>
      {/* 헤더 */}
      <div className={styles.header}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.emotion}>{emotion}</span>
        <span className={styles.confidence}>{confidencePct}%</span>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
      </div>

      {/* 분석 항목 */}
      <div className={styles.grid}>
        <HUDRow label="동공" value={pupil_state} />
        <HUDRow label="귀" value={ear_position} />
        <HUDRow label="자세" value={body_posture} />
        <HUDRow label="수염" value={whisker_direction} />
      </div>

      {/* 신뢰도 바 */}
      <div className={styles.confidenceBar}>
        <div
          className={styles.confidenceFill}
          style={{ width: `${confidencePct}%` }}
        />
      </div>
    </div>
  )
}

function HUDRow({ label, value }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value || '-'}</span>
    </div>
  )
}
