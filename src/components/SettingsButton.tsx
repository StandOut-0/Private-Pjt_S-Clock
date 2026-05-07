import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ui/ThemedText';
import { Platform } from 'react-native';
import { useScheduleStore } from '../store/scheduleStore';
import { ColorPicker } from './ColorPicker';
import { exportSchedulesToJson, exportSchedulesByDate } from '../utils/exportJson';

export function SettingsButton() {
  const { colors, mode, toggleMode } = useTheme();
  const { clockColor, setClockColor, schedules, loadSchedules, selectedDate } = useScheduleStore();
  const [visible, setVisible] = useState(false);

  const handleExportAll = async () => {
    try {
      await loadSchedules();
      await exportSchedulesToJson(schedules);
    } catch (error) {
      Alert.alert('오류', '전체 내보내기에 실패했습니다.');
      console.error(error);
    }
  };

  const handleExportSelectedDate = async () => {
    try {
      await loadSchedules();
      await exportSchedulesByDate(schedules, selectedDate);
    } catch (error) {
      Alert.alert('오류', '선택한 날짜 내보내기에 실패했습니다.');
      console.error(error);
    }
  };

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
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              style={styles.scrollView}
            >
              <ThemedText style={styles.title}>⚙️ 설정</ThemedText>

              {/* Clock Color Setting */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>시계 색상</ThemedText>
                <View style={styles.colorPreviewContainer}>
                  <View 
                    style={[styles.currentColorPreview, { backgroundColor: clockColor }]} 
                  />
                  <ThemedText style={styles.currentColorText}>현재: {clockColor}</ThemedText>
                </View>
                <ColorPicker 
                  selectedColor={clockColor}
                  onSelectColor={setClockColor}
                />
              </View>

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

              {/* Export Data */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>📤 데이터 내보내기</ThemedText>
                <Pressable
                  onPress={handleExportSelectedDate}
                  style={[styles.exportButton, { backgroundColor: clockColor }]}
                >
                  <ThemedText style={styles.exportButtonText}>선택한 날짜 다운</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleExportAll}
                  style={[styles.exportButton, { backgroundColor: clockColor, marginTop: 8 }]}
                >
                  <ThemedText style={styles.exportButtonText}>전체 다운</ThemedText>
                </Pressable>
              </View>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  colorPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  currentColorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  currentColorText: {
    fontSize: 14,
    opacity: 0.8,
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
  exportButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
