import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Platform } from 'react-native';
import { ThemedText } from './ui/ThemedText';
import { useTheme } from '../theme/ThemeProvider';

const STORAGE_KEY = 'sring_warning_dismissed';

export function StorageWarning() {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  if (!visible || Platform.OS !== 'web') return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <ThemedText style={styles.title}>⚠️ 데이터 저장 안내</ThemedText>
      <ThemedText style={styles.text}>
        • 브라우저마다 데이터가 분리됩니다 (Chrome ≠ Edge)\n
        • 시크릿 모드에서 닫으면 데이터가 삭제됩니다\n
        • 주소가 바뀌면 데이터를 찾을 수 없습니다
      </ThemedText>
      <Pressable onPress={dismiss} style={[styles.button, { backgroundColor: colors.primary }]}>
        <ThemedText style={styles.buttonText}>확인</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  text: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
