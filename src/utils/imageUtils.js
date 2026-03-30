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
