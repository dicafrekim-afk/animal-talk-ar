import { GoogleGenerativeAI } from '@google/generative-ai'
import { optimizeImage } from '../utils/imageUtils'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

/**
 * 고양이 행동 분석 결과 스키마
 * @typedef {Object} CatAnalysis
 * @property {boolean} cat_detected
 * @property {string} pupil_state       - 확장됨 | 가늘어짐 | 적당함
 * @property {string} ear_position      - 앞으로 향함 | 마징가 귀 | 뒤로 젖혀짐
 * @property {string} body_posture      - 식빵 굽기 | 웅크림 | 배를 보임 | 아치형 | 서있음
 * @property {string} whisker_direction - 앞으로 쏠림 | 편안함 | 뒤로 당겨짐
 * @property {string} emotion           - 안정 | 흥분/사냥 | 경계 | 두려움 | 호기심
 * @property {number} confidence_score  - 0.0 ~ 1.0
 * @property {string} speech_bubble     - 고양이 대사 (한국어, 1~2문장)
 */

const ANALYSIS_PROMPT = `너는 세계 최고의 고양이 행동 분석 전문가야. 제공된 고양이 사진을 보고 다음 요소들을 아주 섬세하게 관찰해 줘:

1. 동공의 상태 (가늘어짐 / 적당함 / 완전히 확장됨) — 빛뿐 아니라 감정도 고려
2. 귀의 방향 (앞으로 향함 / 마징가 귀(옆으로 벌어짐) / 뒤로 젖혀짐)
3. 몸의 자세 (식빵 굽기 / 웅크림 / 배를 보임 / 아치형 / 서있음)
4. 수염의 방향 (앞으로 쏠림 / 편안함 / 뒤로 당겨짐)
5. 종합 감정 추론 (안정 / 흥분·사냥 / 경계 / 두려움 / 호기심)

위 분석을 바탕으로 이 고양이가 지금 말을 한다면 할 법한 짧고 귀여운 한국어 대사(1~2문장)도 만들어줘.

반드시 아래 JSON 형식만 반환해. 설명 없이 JSON만:
{
  "cat_detected": true,
  "pupil_state": "동공 상태",
  "ear_position": "귀 방향",
  "body_posture": "몸의 자세",
  "whisker_direction": "수염 방향",
  "emotion": "감정",
  "confidence_score": 0.0,
  "speech_bubble": "대사"
}

고양이가 없으면:
{
  "cat_detected": false,
  "pupil_state": "",
  "ear_position": "",
  "body_posture": "",
  "whisker_direction": "",
  "emotion": "",
  "confidence_score": 0.0,
  "speech_bubble": "고양이가 안 보여요! 쿤이나 민이를 카메라에 보여주세요 😸"
}`

/** Mock 데이터 (API 키 없을 때) */
const MOCK_RESULTS = [
  {
    cat_detected: true,
    pupil_state: '완전히 확장됨',
    ear_position: '앞으로 향함',
    body_posture: '웅크림',
    whisker_direction: '앞으로 쏠림',
    emotion: '흥분·사냥',
    confidence_score: 0.91,
    speech_bubble: '저기 뭔가 움직였어! 내가 잡고야 말겠어!',
  },
  {
    cat_detected: true,
    pupil_state: '가늘어짐',
    ear_position: '앞으로 향함',
    body_posture: '식빵 굽기',
    whisker_direction: '편안함',
    emotion: '안정',
    confidence_score: 0.95,
    speech_bubble: '지금 딱 좋은 온도야... 건들지 마.',
  },
  {
    cat_detected: true,
    pupil_state: '적당함',
    ear_position: '마징가 귀',
    body_posture: '서있음',
    whisker_direction: '앞으로 쏠림',
    emotion: '호기심',
    confidence_score: 0.87,
    speech_bubble: '저게 뭐지? 조금만 더 가까이 가볼까냥~',
  },
]

/**
 * 카메라 프레임(base64 JPEG)을 Gemini 1.5 Pro로 분석
 * @param {string} base64Image
 * @returns {Promise<CatAnalysis>}
 */
export async function analyzeFrame(base64Image, signal) {
  // 이미지 최적화 (1500px 기준 리사이즈)
  const optimizedBase64 = await optimizeImage(base64Image)

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  if (!API_KEY) {
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, 1200)
      signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')) })
    })
    return MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)]
  }

  const genAI = new GoogleGenerativeAI(API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2, // 환각 최소화, 분석 일관성 확보
    },
  })

  const imagePart = {
    inlineData: {
      data: optimizedBase64,
      mimeType: 'image/jpeg',
    },
  }

  const result = await model.generateContent([ANALYSIS_PROMPT, imagePart])
  const text = result.response.text().trim()

  try {
    return JSON.parse(text)
  } catch {
    console.error('JSON 파싱 실패:', text)
    return {
      cat_detected: false,
      speech_bubble: '분석 결과를 읽지 못했어요 😿',
      confidence_score: 0,
    }
  }
}
