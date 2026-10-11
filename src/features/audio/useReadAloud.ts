import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import { getCurrentLanguage } from '@/i18n';
import { resolveVoice } from './voices';

/** Códigos de idioma (BCP 47) das vozes do sistema para cada idioma do app. */
const SPEECH_LANGUAGE = { pt: 'pt-BR', en: 'en-US' } as const;

/** Um pouco mais devagar que o normal: é leitura de devocional, não de notícia. */
const SPEECH_RATE = 0.92;

/**
 * Quebra o texto em pedaços que cabem no limite do sistema (no Android há um teto por chamada),
 * preferindo cortar no fim de uma frase ou parágrafo para a voz não parar no meio.
 */
export function splitForSpeech(text: string, maxLength: number): string[] {
  const limit = Math.max(200, Math.min(maxLength - 50, 1500));
  const clean = text
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  const chunks: string[] = [];
  let rest = clean;
  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    const cut = Math.max(
      window.lastIndexOf('\n'),
      window.lastIndexOf('. '),
      window.lastIndexOf('? '),
      window.lastIndexOf('! '),
    );
    const end =
      cut > limit * 0.4 ? cut + 1 : window.lastIndexOf(' ') > 0 ? window.lastIndexOf(' ') : limit;
    chunks.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trim();
  }
  if (rest) chunks.push(rest);
  return chunks.filter(Boolean);
}

/**
 * Lê um texto em voz alta com a voz do próprio aparelho. Usa a voz escolhida em Configurações ou, no
 * automático, a mais natural instalada (as vozes "de rede" do Google são neurais). Se essa voz falhar
 * (ex.: voz de rede sem internet), tenta de novo com a voz padrão do sistema. Só um texto por vez; para
 * ao desmontar a tela e quando o app vai para o segundo plano.
 */
export function useReadAloud() {
  const [speaking, setSpeaking] = useState(false);
  const [failed, setFailed] = useState(false);
  // Cada leitura tem um número: avisos de uma leitura antiga (parada, trocada) não mexem na atual.
  const sessionRef = useRef(0);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    setSpeaking(false);
    Speech.stop().catch(() => {});
  }, []);

  const speak = useCallback(async (text: string) => {
    const chunks = splitForSpeech(text, Speech.maxSpeechInputLength);
    if (chunks.length === 0) return;

    const id = ++sessionRef.current;
    setFailed(false);
    setSpeaking(true);
    // Interrompe qualquer leitura anterior antes de enfileirar a nova.
    Speech.stop().catch(() => {});

    const appLanguage = getCurrentLanguage();
    const language = SPEECH_LANGUAGE[appLanguage];
    const voice = await resolveVoice(appLanguage);
    if (sessionRef.current !== id) return; // parou ou trocou enquanto escolhia a voz

    let fellBack = false;
    const run = (withVoice: string | undefined) => {
      chunks.forEach((chunk, index) => {
        const isLast = index === chunks.length - 1;
        Speech.speak(chunk, {
          language,
          voice: withVoice,
          rate: SPEECH_RATE,
          onDone: () => {
            if (isLast && sessionRef.current === id) setSpeaking(false);
          },
          onStopped: () => {
            if (sessionRef.current === id) setSpeaking(false);
          },
          onError: () => {
            if (sessionRef.current !== id) return;
            Speech.stop().catch(() => {});
            if (withVoice) {
              // A voz escolhida não funcionou (rede, voz removida): tenta a padrão do sistema, uma vez.
              if (!fellBack) {
                fellBack = true;
                run(undefined);
              }
              return;
            }
            sessionRef.current += 1;
            setSpeaking(false);
            setFailed(true);
          },
        });
      });
    };
    run(voice);
  }, []);

  const toggle = useCallback(
    (text: string) => {
      if (speaking) stop();
      else void speak(text);
    },
    [speaking, speak, stop],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stop();
    });
    return () => {
      subscription.remove();
      sessionRef.current += 1;
      Speech.stop().catch(() => {});
    };
  }, [stop]);

  return { speaking, failed, toggle, stop };
}
