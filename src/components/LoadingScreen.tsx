import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LumiMascot } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

/**
 * Tela de espera entre login/abertura e a tela principal: o Lumi
 * "respira" (sobe e desce devagar) em vez de deixar a tela em branco
 * enquanto a sessão e o perfil carregam.
 */
export function LoadingScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const [bob] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          transform: [
            { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [6, -10] }) },
          ],
        }}
      >
        <LumiMascot mood="normal" size={190} />
      </Animated.View>
      <Text style={styles.label}>{t('common.loading')}</Text>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.lg,
      backgroundColor: theme.colors.bg,
    },
    label: {
      ...theme.typography.bodyStrong,
      color: theme.colors.muted,
    },
  });
