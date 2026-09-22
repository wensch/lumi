import { Text } from 'react-native';
import { Card, ScreenContainer } from '@/components';
import { typography } from '@/theme';

export default function BibliaScreen() {
  return (
    <ScreenContainer>
      <Text style={typography.title}>Bíblia</Text>
      <Card>
        <Text style={typography.body}>
          Busca, temas, livros e passagens chegam em breve por aqui.
        </Text>
      </Card>
    </ScreenContainer>
  );
}
