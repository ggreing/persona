import { useState, useCallback } from 'react';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface TTSParams {
  voice_name?: string;
  speaking_rate?: number;
  pitch?: number;
  model?: string; // 사용할 TTS 모델 (예: 'GoogleTTS')
}

export default function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 주어진 텍스트를 한번만 TTS로 변환하여 재생합니다. (일반 텍스트 채팅용)
   * @param text - 음성으로 변환할 텍스트
   * @param params - 음성, 속도, 피치 등 TTS 파라미터
   */
  const speakOnce = useCallback(async (text: string, params: TTSParams = {}) => {
    if (!text || isPlaying) return;

    setIsPlaying(true);
    setError(null);
    console.log("🔊 TTS (Once) 호출:", { text: text.substring(0, 30), params });

    try {
      // TODO: 이 API 라우트를 만들어야 함
      const res = await fetch(`/api/tts-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, ...params }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`TTS API 오류: ${errorText}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setError('오디오 재생 중 오류가 발생했습니다.');
        setIsPlaying(false);
      };

      await audio.play();
    } catch (e: any) {
      console.error("❌ TTS 처리 중 오류:", e);
      setError(e.message);
      setIsPlaying(false);
    }
  }, [isPlaying]);


  /**
   * 세션 ID를 기반으로 TTS 음성 생성이 완료될 때까지 폴링합니다. (음성 채팅용)
   * @param sessionId - 현재 대화 세션 ID
   * @param interval - 폴링 간격 (밀리초)
   * @param timeout - 최대 대기 시간 (밀리초)
   */
  const pollForSpeech = useCallback(async (sessionId: string, interval = 2000, timeout = 30000) => {
    if (isPlaying) return;

    setIsPlaying(true);
    setError(null);
    const startTime = Date.now();

    console.log(`🔊 TTS (Polling) 시작: 세션 ${sessionId}`);

    const poll = async (resolve: (value: unknown) => void, reject: (reason?: any) => void) => {
      if (Date.now() - startTime > timeout) {
        reject(new Error('TTS 음성 생성 시간 초과'));
        return;
      }

      try {
        const res = await fetch(`${backendUrl}/api/chat/${sessionId}/audio-status`);
        const data = await res.json();

        if (data.status === 'ready' && data.audio_url) {
          console.log(`✅ TTS 음성 준비 완료: ${data.audio_url}`);
          const audio = new Audio(data.audio_url);
          audio.onended = () => setIsPlaying(false);
          audio.onerror = () => reject(new Error('폴링된 오디오 재생 오류'));
          await audio.play();
          resolve(true);
        } else if (data.status === 'processing') {
          console.log('...TTS 처리 중, 잠시 후 다시 시도합니다.');
          setTimeout(() => poll(resolve, reject), interval);
        } else {
          reject(new Error(data.error_message || '알 수 없는 TTS 오류'));
        }
      } catch (e: any) {
        reject(new Error(`폴링 중 네트워크 오류: ${e.message}`));
      }
    };

    return new Promise(poll).catch(e => {
      console.error("❌ TTS 폴링 중 오류:", e);
      setError(e.message);
    }).finally(() => {
      setIsPlaying(false);
    });
  }, [isPlaying]);

  return { speakOnce, pollForSpeech, isPlaying, error };
}
