import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ui/ThemedText';
import { Platform } from 'react-native';

export function SettingsButton() {
  const { colors, mode, toggleMode } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginRight: 8,
        }}
      >
        <ThemedText style={{ fontSize: 18 }}>⚙️</ThemedText>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setVisible(false)}
        >
          <View
            style={[styles.modal, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView>
              <ThemedText style={styles.title}>⚙️ 설정</ThemedText>

              {/* Dark Mode Toggle */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>화면 모드</ThemedText>
                <Pressable
                  onPress={toggleMode}
                  style={[styles.toggleButton, { borderColor: colors.border }]}
                >
                  <ThemedText>{mode === 'dark' ? '🌙 다크 모드' : '☀️ 라이트 모드'}</ThemedText>
                </Pressable>
              </View>

              {/* Storage Warning */}
              {Platform.OS === 'web' && (
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>⚠️ 데이터 저장 안내</ThemedText>
                  <ThemedText style={styles.warningText}>
                    • 브라우저마다 데이터가 분리됩니다 (Chrome ≠ Edge){'\n'}
                    • 시크릿 모드에서 닫으면 데이터가 삭제됩니다{'\n'}
                    • 주소가 바뀌면 데이터를 찾을 수 없습니다
                  </ThemedText>
                </View>
              )}

              <Pressable
                onPress={() => setVisible(false)}
                style={[styles.closeButton, { backgroundColor: colors.primary }]}
              >
                <ThemedText style={styles.closeButtonText}>닫기</ThemedText>
              </Pressable>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  toggleButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
  closeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
