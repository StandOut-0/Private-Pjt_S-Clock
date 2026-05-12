import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// 햅틱 피드백 유틸리티
export const HapticFeedback = {
  // 가벼운 성공 피드백 (스케줄 생성)
  success: async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        // 햅틱이 지원되지 않는 환경에서는 무시
        console.log('Haptics not supported');
      }
    }
  },

  // 가벼운 에러 피드백 (스케줄 삭제)
  error: async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (error) {
        console.log('Haptics not supported');
      }
    }
  },

  // 경고 피드백
  warning: async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (error) {
        console.log('Haptics not supported');
      }
    }
  },

  // 가벼운 터치 피드백 (버튼 클릭 등)
  light: async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('Haptics not supported');
      }
    }
  },

  // 중간 강도의 피드백
  medium: async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.log('Haptics not supported');
      }
    }
  },

  // 강한 피드백
  heavy: async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptics not supported');
      }
    }
  },

  // 선택 피드백 (토글 등)
  selection: async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.selectionAsync();
      } catch (error) {
        console.log('Haptics not supported');
      }
    }
  },
};
