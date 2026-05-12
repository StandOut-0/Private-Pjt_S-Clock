import { Text, type TextProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';

type Props = TextProps & {
  muted?: boolean;
};

export function ThemedText({ style, muted = false, ...props }: Props) {
  const { colors } = useTheme();

  return (
    <Text
      allowFontScaling={true}
      style={[
        {
          color: muted ? colors.mutedText : colors.text,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.size.md,
          lineHeight: typography.lineHeight.md,
        },
        style,
      ]}
      {...props}
    />
  );
}
