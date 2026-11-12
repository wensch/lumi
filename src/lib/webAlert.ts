import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * Na web (usada só em testes) o `Alert.alert` do React Native não faz nada: confirmações como "trocar de plano" e
 * "desistir do desafio" nunca apareciam. Aqui ele passa a usar `window.confirm` / `window.alert`. No celular
 * este arquivo não muda nada.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const actions = (buttons ?? []).filter((button) => button.style !== 'cancel');
    const cancel = (buttons ?? []).find((button) => button.style === 'cancel');
    if (actions.length === 0) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    if (window.confirm(text)) actions[0].onPress?.();
    else cancel?.onPress?.();
  };
}
