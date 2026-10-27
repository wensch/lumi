import 'react-native-svg';

// O Phosphor passa `className` ao Svg (para web); o tipo do react-native-svg não o declara e o tsc
// reclama dentro do pacote, já que importamos o código-fonte de cada ícone (src/icons/*).
declare module 'react-native-svg' {
  interface SvgProps {
    className?: string;
  }
}
