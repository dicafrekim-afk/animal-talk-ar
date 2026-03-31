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

const ANALYSIS_PROMPT = `너는 고양이 행동 분석 전문가야. 아래 기준과 절차에 따라 단계적으로 분석해.

## 각 신호별 판단 기준

**동공 상태 (조명 무시하고 감정 중심으로 판단):**
- 가늘어짐: 동공이 세로 슬릿(가느다란 선) 형태 → 만족·졸림·햇빛
- 적당함: 타원 또는 중간 크기 → 평온
- 완전히 확장됨: 동공이 홍채 대부분을 가득 채움 → 흥분·두려움·집중

**귀 방향:**
- 앞으로 향함: 귀 끝이 앞 또는 위로 쫑긋 세워짐 → 호기심·집중
- 마징가 귀: 귀가 머리 양 옆으로 납작하게 벌어짐 → 짜증·경계
- 뒤로 젖혀짐: 귀가 머리에 완전히 눌려 납작해짐 → 두려움·공격성

**몸의 자세:**
- 식빵 굽기: 앞발을 몸 아래 접고 낮게 앉음 → 안정·졸림
- 웅크림: 몸을 동그랗게 말아 최소화 → 불안·추위
- 배를 보임: 드러누워 배를 완전히 노출 → 극도의 신뢰·편안
- 아치형: 등을 높이 굽혀 올림 → 위협·놀람
- 서있음: 네 발로 바닥에 서 있음 → 탐색·이동 준비

**수염 방향:**
- 앞으로 쏠림: 수염이 앞쪽으로 모여 뾰족하게 → 사냥·집중
- 편안함: 수염이 양 옆으로 자연스럽게 퍼짐 → 안정
- 뒤로 당겨짐: 수염이 얼굴 쪽으로 붙음 → 두려움·위협

## 감정 조합 판단 룰
- 동공확장 + 귀앞 + 수염앞 → 흥분·사냥
- 동공가늘 + 귀앞 + 식빵 또는 배노출 → 안정
- 귀뒤 + 동공확장 + 웅크림 → 두려움
- 마징가귀 + 수염뒤 → 경계
- 귀앞 + 동공적당 + 서있음 또는 수염앞 → 호기심
- 신호가 엇갈리면 가장 많은 신호가 가리키는 감정을 선택

## 분석 절차 (순서대로 수행)
1단계: 이미지에 고양이가 있는지 확인. 없으면 cat_detected: false로 즉시 반환.
2단계: 동공 → 귀 → 수염 → 몸 순서로 각 신호를 위 기준에 맞게 하나씩 판단.
3단계: 조합 룰을 적용해 감정을 결정.
4단계: confidence_score 계산 — 4개 신호 모두 명확히 보임: 0.85~1.0 / 2~3개 보임: 0.55~0.8 / 1개 이하 또는 불명확: 0.3~0.5.
5단계: 아래 규칙에 따라 고양이 대사를 1~2문장 작성.
  - 고양이가 지금 이 순간 집사에게 직접 말하는 방식으로 작성 (1인칭, 현재형)
  - 감정·욕구를 직접 표현 (예: "배고파", "놀아줘", "건들지 마", "저기 뭔가 있어!")
  - 너무 길거나 설명적이면 안 됨. 짧고 직관적으로.
  - 고양이 특유의 표현 자유롭게 사용 ("냥", "~거든", "~라고", "~잖아" 등)
  - 감정별 대사 방향:
    * 안정 → 만족감, 지금 건드리지 말라는 느낌 ("지금 딱 좋아. 건들지 마.")
    * 흥분·사냥 → 뭔가 발견했거나 사냥 욕구 ("저기 뭔가 있어! 내가 잡고 말겠어!")
    * 경계 → 낯선 것에 대한 긴장 ("지금 뭐가 이상한데... 좀 봐봐.")
    * 두려움 → 무섭거나 도망치고 싶은 느낌 ("무서워... 나 지금 좀 안아줘.")
    * 호기심 → 궁금한 게 생긴 느낌 ("저게 뭐야? 나 가봐야 할 것 같은데냥.")
  - 배고픔 신호(자세+귀 조합으로 판단될 경우) → "밥은요? 밥 언제 줄 거야."

반드시 아래 JSON만 반환해. 설명·주석 없이 JSON만:
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
    speech_bubble: '저기 뭔가 있어! 내가 잡고 말겠다냥!',
  },
  {
    cat_detected: true,
    pupil_state: '가늘어짐',
    ear_position: '앞으로 향함',
    body_posture: '식빵 굽기',
    whisker_direction: '편안함',
    emotion: '안정',
    confidence_score: 0.95,
    speech_bubble: '지금 딱 좋거든. 건들지 마.',
  },
  {
    cat_detected: true,
    pupil_state: '적당함',
    ear_position: '마징가 귀',
    body_posture: '서있음',
    whisker_direction: '앞으로 쏠림',
    emotion: '호기심',
    confidence_score: 0.87,
    speech_bubble: '저게 뭐야? 나 가봐야 할 것 같은데냥.',
  },
  {
    cat_detected: true,
    pupil_state: '적당함',
    ear_position: '앞으로 향함',
    body_posture: '서있음',
    whisker_direction: '편안함',
    emotion: '경계',
    confidence_score: 0.82,
    speech_bubble: '밥은요? 밥 언제 줄 거야.',
  },
  {
    cat_detected: true,
    pupil_state: '완전히 확장됨',
    ear_position: '뒤로 젖혀짐',
    body_posture: '웅크림',
    whisker_direction: '뒤로 당겨짐',
    emotion: '두려움',
    confidence_score: 0.88,
    speech_bubble: '무서워... 나 좀 안아줘.',
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
    model: 'gemini-2.0-flash',
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
