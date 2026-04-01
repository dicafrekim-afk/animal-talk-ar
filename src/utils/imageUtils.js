/**
 * 이미지 전처리 유틸리티
 * 규격서 기준: 가장 긴 변 1500px, 고품질 JPEG
 */

const MAX_LONGEST_SIDE = 1500
const JPEG_QUALITY = 0.88

/**
 * base64 JPEG 이미지를 최적 해상도로 리사이즈
 * @param {string} base64 - data URL 없는 순수 base64
 * @returns {Promise<string>} 최적화된 base64
 */
export async function optimizeImage(base64) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const { width, height } = img
      const longestSide = Math.max(width, height)

      // 이미 충분히 작으면 그대로 반환
      if (longestSide <= MAX_LONGEST_SIDE) {
        resolve(base64)
        return
      }

      const scale = MAX_LONGEST_SIDE / longestSide
      const newWidth = Math.round(width * scale)
      const newHeight = Math.round(height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = newWidth
      canvas.height = newHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
      resolve(dataUrl.split(',')[1])
    }
    img.onerror = reject
    img.src = `data:image/jpeg;base64,${base64}`
  })
}

/**
 * File 객체를 base64 문자열로 변환 (data URL prefix 없음)
 * @param {File} file
 * @returns {Promise<string>} base64
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 비디오 엘리먼트에서 고품질 base64 JPEG 캡처
 * @param {HTMLVideoElement} video
 * @returns {string} base64 (data URL prefix 없음)
 */
export function captureVideoFrame(video) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 640
  canvas.height = video.videoHeight || 480
  canvas.getContext('2d').drawImage(video, 0, 0)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1]
}

/**
 * 인접 픽셀 차이 합산으로 이미지 선명도 측정 (높을수록 선명)
 * @param {string} base64
 * @returns {Promise<number>}
 */
function measureSharpness(base64) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const SIZE = 64
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, SIZE, SIZE)
      const data = ctx.getImageData(0, 0, SIZE, SIZE).data
      let sum = 0
      for (let i = 0; i < data.length - 4; i += 4) {
        sum += Math.abs(data[i] - data[i + 4])           // 가로 방향 엣지
        if (i + SIZE * 4 < data.length) {
          sum += Math.abs(data[i] - data[i + SIZE * 4])  // 세로 방향 엣지
        }
      }
      resolve(sum)
    }
    img.onerror = () => resolve(0)
    img.src = `data:image/jpeg;base64,${base64}`
  })
}

/**
 * 여러 프레임 중 가장 선명한 프레임을 캡처해 반환
 * @param {HTMLVideoElement} video
 * @param {number} count - 캡처할 프레임 수 (기본 3)
 * @param {number} interval - 프레임 간 간격 ms (기본 150)
 * @returns {Promise<string>} 가장 선명한 프레임의 base64
 */
export async function captureSharpestFrame(video, count = 3, interval = 150) {
  const frames = []
  for (let i = 0; i < count; i++) {
    const base64 = captureVideoFrame(video)
    const sharpness = await measureSharpness(base64)
    frames.push({ base64, sharpness })
    if (i < count - 1) {
      await new Promise(r => setTimeout(r, interval))
    }
  }
  frames.sort((a, b) => b.sharpness - a.sharpness)
  return frames[0].base64
}
