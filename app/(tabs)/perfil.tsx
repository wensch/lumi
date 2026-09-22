import { Text } from 'react-native';
import { Button, Card, ScreenContainer } from '@/components';
import { useAuth } from '@/features/auth';
import { typography } from '@/theme';

export default function PerfilScreen() {
  const { session, signOut } = useAuth();

  return (
    <ScreenContainer>
      <Text style={typography.title}>Perfil</Text>
      <Card>
        <Text style={typography.body}>
          Histórico, conquistas, preferências e configurações chegam em breve.
        </Text>
      </Card>
      <Card>
        <Text style={typography.caption}>Conectado como {session?.user.email}</Text>
        <Button variant="ghost" label="Sair" onPress={signOut} />
      </Card>
    </ScreenContainer>
  );
}
