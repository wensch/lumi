import { Text } from 'react-native';
import { Screen, Section } from '@/components';
import { BibleReferenceCard } from '@/features/devotional/BibleReferenceCard';
import { typography } from '@/theme';

export default function BibliaScreen() {
  return (
    <Screen>
      <Text style={typography.title}>Bíblia</Text>
      <BibleReferenceCard reference="JHN.3.16" versionId={3034} />
      <Section>
        <Text style={typography.body}>Busca, temas e mais passagens chegam em breve por aqui.</Text>
      </Section>
    </Screen>
  );
}
