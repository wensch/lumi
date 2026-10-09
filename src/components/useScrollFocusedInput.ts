import { useCallback, useEffect, useRef } from 'react';
import {
  Dimensions,
  Keyboard,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from 'react-native';

/**
 * Quando o teclado abre, rola o ScrollView até o campo em foco ficar acima dele. O
 * KeyboardAvoidingView só encolhe a área visível; sem isso, um campo no meio/fim da tela
 * continua escondido atrás do teclado (Android com borda a borda não redimensiona a janela).
 */
export function useScrollFocusedInput() {
  const ref = useRef<ScrollView | null>(null);
  const offsetY = useRef(0);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', (event) => {
      const input = TextInput.State.currentlyFocusedInput?.();
      if (!input) return;
      const keyboardTop =
        event.endCoordinates.screenY ||
        Dimensions.get('window').height - event.endCoordinates.height;
      // Espera o KeyboardAvoidingView aplicar o padding antes de medir.
      setTimeout(() => {
        input.measureInWindow((_x, y, _width, height) => {
          const overflow = y + height - (keyboardTop - 20);
          if (overflow > 0) {
            ref.current?.scrollTo({ y: offsetY.current + overflow, animated: true });
          }
        });
      }, 100);
    });
    return () => subscription.remove();
  }, []);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = event.nativeEvent.contentOffset.y;
  }, []);

  return { ref, onScroll };
}
