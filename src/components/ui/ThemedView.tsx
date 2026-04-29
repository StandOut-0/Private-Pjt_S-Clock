import { View, type ViewProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

type Props = ViewProps & {
  useCard?: boolean;
};

export function ThemedView({ style, useCard = false, ...props }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        { backgroundColor: useCard ? colors.card : colors.background },
        style,
      ]}
      {...props}
    />
  );
}
