import React from 'react';
import { Pressable, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ui/ThemedText';

interface AnimatedViewToggleButtonProps {
  currentView: 'ring' | 'list';
}

export function AnimatedViewToggleButton({ currentView }: AnimatedViewToggleButtonProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(1)).current;

  const isRingView = currentView === 'ring';

  const handlePress = () => {
    // 누름 애니메이션
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 화면 전환
    setTimeout(() => {
      router.push(isRingView ? '/list' : '/');
    }, 150);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.button, { backgroundColor: colors.border }]}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <ThemedText style={styles.text}>
          {isRingView ? '☰' : '○'}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    lineHeight: 32,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
