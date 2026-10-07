import { Redirect } from 'expo-router';

/**
 * Rota desconhecida (ex.: o redirect lumi://callback do login YouVersion, que não tem tela própria):
 * volta ao início em vez de mostrar "Unmatched Route".
 */
export default function NotFoundScreen() {
  return <Redirect href="/" />;
}
