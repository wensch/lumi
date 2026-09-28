import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { BibleCard } from '@youversion/platform-react-native-expo-ui';
import { Card } from '@/components';
import { colors, typography } from '@/theme';

type Props = {
  reference: string;
  versionId: number;
  style?: StyleProp<ViewStyle>;
};

type State = { hasError: boolean };

/**
 * BibleCard usa um DOM Component (WebView) por baixo — em dev, Fast
 * Refresh remontando a árvore pode derrubar a view nativa antes de uma
 * chamada assíncrona pendente terminar, gerando
 * "DomWebView.injectJavaScript has been rejected". Envolvido em error
 * boundary para nunca derrubar a tela inteira do devocional por causa
 * disso — mostra a referência como texto simples no lugar.
 */
export class BibleReferenceCard extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Card style={this.props.style}>
          <Text style={typography.bodyStrong}>{this.props.reference}</Text>
          <Text style={[typography.caption, styles.fallbackHint]}>
            Não foi possível carregar o texto bíblico agora.
          </Text>
        </Card>
      );
    }

    return (
      <Card style={this.props.style}>
        <BibleCard reference={this.props.reference} versionId={this.props.versionId} />
      </Card>
    );
  }
}

const styles = StyleSheet.create({
  fallbackHint: {
    color: colors.ink,
    opacity: 0.7,
  },
});
