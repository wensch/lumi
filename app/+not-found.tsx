import { Redirect } from 'expo-router';

/**
 * Rota desconhecida (link velho ou digitado errado): volta ao início em vez de mostrar "Unmatched Route".
 * O retorno do login YouVersion (lumi://callback) é tratado antes, em `+native-intent.tsx`.
 */
export default function NotFoundScreen() {
  return <Redirect href="/" />;
}
