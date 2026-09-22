import { Text } from 'react-native';
import { BibleCard } from '@youversion/platform-react-native-expo-ui';
import { Card, ScreenContainer } from '@/components';
import { typography } from '@/theme';

export default function BibliaScreen() {
  return (
    <ScreenContainer>
      <Text style={typography.title}>Bíblia</Text>
      <Card>
        <BibleCard reference="JHN.3.16" versionId={3034} />
      </Card>
      <Card>
        <Text style={typography.body}>Busca, temas e mais passagens chegam em breve por aqui.</Text>
      </Card>
    </ScreenContainer>
  );
}
