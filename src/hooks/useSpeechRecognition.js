import { useState, useEffect, useRef } from 'react';

const COMMANDS = ['현재 상태 알려줘', '지금 기분 어때', '말 걸기'];

/**
 * 음성 인식을 처리하는 커스텀 훅
 * @param {() => void} onCommand - 음성 명령이 감지되었을 때 호출될 콜백 함수
 * @returns {{
 *   isListening: boolean,
 *   isSupported: boolean,
 *   start: () => void,
 *   stop: () => void
 * }}
 */
export function useSpeechRecognition(onCommand) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('이 브라우저에서는 음성 인식을 지원하지 않습니다.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = true; // 계속해서 음성을 인식
    recognition.interimResults = false; // 최종 결과만 받음

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('음성 인식 오류:', event.error);
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      console.log('인식된 텍스트:', transcript);

      if (COMMANDS.some(cmd => transcript.includes(cmd))) {
        console.log('명령 감지! 분석을 시작합니다.');
        onCommand();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onCommand]);

  const start = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch(e) {
        console.error("음성 인식이 이미 시작되었습니다.", e)
      }
    }
  };

  const stop = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  return {
    isListening,
    isSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    start,
    stop,
  };
}
