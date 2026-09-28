import { Text } from 'react-native';
import { Screen, Section } from '@/components';
import { typography } from '@/theme';

export default function BibliaScreen() {
  return (
    <Screen>
      <Text style={typography.title}>Bíblia</Text>
      <Section>
        <Text style={typography.body}>Busca, temas e mais passagens chegam em breve por aqui.</Text>
      </Section>
    </Screen>
  );
}
