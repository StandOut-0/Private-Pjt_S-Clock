import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ui/ThemedText';
import { Platform } from 'react-native';
import { useScheduleStore } from '../store/scheduleStore';
import { ColorPicker } from './ColorPicker';
import { exportSchedulesToJson, exportSchedulesByDate, importSchedulesFromJson } from '../utils/exportJson';
import { getContrastTextColor } from '../utils/colorGen';

export function SettingsButton() {
  const { colors, mode, toggleMode } = useTheme();
  const { clockColor, setClockColor, schedules, loadSchedules, selectedDate } = useScheduleStore();
  const [visible, setVisible] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
  } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const handleExportAll = async () => {
    try {
      // 전체 스케줄 직접 가져오기
      const { getAllSchedules } = await import('../db/database');
      const allSchedules = await getAllSchedules();
      console.log('📤 전체 내보내기 - 스케줄 수:', allSchedules.length);
      await exportSchedulesToJson(allSchedules);
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

  const handleImport = async () => {
    setIsImporting(true);
    try {
      // 파일 선택 시작 알림
      if (Platform.OS === 'web') {
        // 웹에서는 자동으로 파일 선택창이 열림
      } else {
        Alert.alert('데이터 가져오기', 'JSON 파일을 선택하세요...');
      }
      
      const result = await importSchedulesFromJson();
      
      // 데이터 반영 중 알림
      if (Platform.OS === 'web') {
        console.log('데이터를 반영 중입니다...');
      }
      
      await loadSchedules(); // 데이터 새로고침
      
      // 결과 저장 및 모달 표시
      setImportResult(result);
      setShowResultModal(true);
    } catch (error) {
      if (error instanceof Error && error.message === 'File selection cancelled') {
        // 사용자가 취소한 경우는 오류로 처리하지 않음
        console.log('파일 선택이 취소되었습니다.');
      } else {
        Alert.alert('오류', '데이터 가져오기에 실패했습니다.');
        console.error(error);
      }
    } finally {
      setIsImporting(false);
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
                <ThemedText style={styles.sectionTitle}>화면모드변경</ThemedText>
                <Pressable
                  onPress={toggleMode}
                  style={[styles.toggleButton, { borderColor: colors.border }]}
                >
                  <ThemedText>{mode === 'dark' ? '☀️ 라이트 모드' : '🌙 다크 모드'}</ThemedText>
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

              {/* Import/Export Data */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>📤 데이터 내보내기</ThemedText>
                <Pressable
                  onPress={handleExportSelectedDate}
                  style={[styles.exportButton, { backgroundColor: clockColor }]}
                >
                  <ThemedText style={[styles.exportButtonText, { color: getContrastTextColor(clockColor) }]}>선택한 날짜 다운</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleExportAll}
                  style={[styles.exportButton, { backgroundColor: clockColor, marginTop: 8 }]}
                >
                  <ThemedText style={[styles.exportButtonText, { color: getContrastTextColor(clockColor) }]}>전체 다운</ThemedText>
                </Pressable>
              </View>

              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>📥 데이터 가져오기</ThemedText>
                <Pressable
                  onPress={handleImport}
                  disabled={isImporting}
                  style={[styles.importButton, { 
                    backgroundColor: isImporting ? '#9CA3AF' : colors.primary,
                    opacity: isImporting ? 0.6 : 1
                  }]}
                >
                  <ThemedText style={styles.importButtonText}>
                    {isImporting ? '⏳ 가져오는 중...' : 'JSON 파일 선택'}
                  </ThemedText>
                </Pressable>
                <ThemedText style={styles.importNote}>
                  • 이전에 내보낸 JSON 파일을 선택하세요{'\n'}
                  • 중복된 데이터는 자동으로 덮어쓰기됩니다{'\n'}
                  • 유효하지 않은 데이터는 건너뜁니다
                </ThemedText>
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

      {/* Import Result Modal */}
      <Modal
        visible={showResultModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResultModal(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setShowResultModal(false)}
        >
          <View
            style={[styles.resultModal, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.resultContent}>
              <ThemedText style={styles.resultTitle}>✅ 완료</ThemedText>
              <ThemedText style={styles.resultMessage}>
                데이터가 성공적으로 가져와졌습니다!
              </ThemedText>
              
              {importResult && (
                <View style={styles.resultStats}>
                  <View style={styles.statRow}>
                    <ThemedText style={styles.statLabel}>새로 추가:</ThemedText>
                    <ThemedText style={styles.statValue}>{importResult.imported}개</ThemedText>
                  </View>
                  <View style={styles.statRow}>
                    <ThemedText style={styles.statLabel}>덮어쓰기:</ThemedText>
                    <ThemedText style={styles.statValue}>{importResult.updated}개</ThemedText>
                  </View>
                  <View style={styles.statRow}>
                    <ThemedText style={styles.statLabel}>건너뛰기:</ThemedText>
                    <ThemedText style={styles.statValue}>{importResult.skipped}개</ThemedText>
                  </View>
                </View>
              )}
              
              <ThemedText style={styles.resultNote}>
                변경사항이 화면에 반영되었습니다.
              </ThemedText>
            </View>
            
            <Pressable
              onPress={() => setShowResultModal(false)}
              style={[styles.resultCloseButton, { backgroundColor: colors.primary }]}
            >
              <ThemedText style={styles.resultCloseButtonText}>확인</ThemedText>
            </Pressable>
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
  importButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  importButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  importNote: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.7,
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
  resultModal: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  resultContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  resultMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  resultStats: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultNote: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  resultCloseButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  resultCloseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
