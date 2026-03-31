import { useState, useEffect, useRef, useCallback } from 'react';

const COMMANDS = ['현재 상태 알려줘', '지금 기분 어때', '말 걸기'];

/**
 * 음성 인식을 처리하는 커스텀 훅
 * @param {() => void} onCommand - 음성 명령이 감지되었을 때 호출될 콜백 함수
 * @returns {{
 *   isListening: boolean,
 *   isSupported: boolean,
 *   error: string | null,
 *   start: () => void,
 *   stop: () => void
 * }}
 */
export function useSpeechRecognition(onCommand) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const manuallyStoppedRef = useRef(false);

  const onResult = useCallback((event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    console.log('인식된 텍스트:', transcript);

    if (COMMANDS.some(cmd => transcript.includes(cmd))) {
      console.log('명령 감지! 분석을 시작합니다.');
      onCommand();
    }
  }, [onCommand]);

  const onEnd = useCallback(() => {
    setIsListening(false);
    // 수동으로 중지한 게 아니라면, 잠시 후 다시 시작 (e.g. 브라우저 타임아웃)
    if (!manuallyStoppedRef.current) {
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch (e) {
          if (e.name !== 'InvalidStateError') {
             console.error('음성 인식 재시작 실패:', e);
          }
        }
      }, 500);
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('음성 인식을 지원하지 않는 브라우저입니다.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = false; // continuous는 타임아웃이 길어 수동 재시작으로 제어
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onerror = (event) => {
      console.error('음성 인식 오류:', event.error);
      let errorMessage = event.error;
      if (event.error === 'not-allowed') {
        errorMessage = '마이크 사용 권한이 필요합니다.';
      } else if (event.error === 'network') {
        errorMessage = '네트워크 문제로 음성 인식을 시작할 수 없습니다.';
      }
      setError(errorMessage);
      setIsListening(false);
    };

    recognition.onresult = onResult;
    recognition.onend = onEnd;

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onResult, onEnd]);

  const start = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        manuallyStoppedRef.current = false;
        recognitionRef.current.start();
      } catch(e) {
        console.error("음성 인식을 시작할 수 없습니다:", e);
      }
    }
  }, [isListening]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      manuallyStoppedRef.current = true;
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isListening,
    error,
    isSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    start,
    stop,
  };
}
