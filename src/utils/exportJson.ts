import * as FileSystem from 'expo-file-system';
// @ts-ignore - expo-sharing includes its own types
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Schedule } from '../db/database';

/**
 * 전체 스케줄을 JSON으로 직렬화하여 파일로 저장하고 공유 시트를 엽니다
 */
export async function exportSchedulesToJson(schedules: Schedule[]): Promise<void> {
  try {
    // JSON 직렬화
    const jsonData = JSON.stringify(schedules, null, 2);
    
    // 파일 이름 생성 (현재 날짜 기반)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const fileName = `s-ring-export-${dateStr}.json`;
    
    if (Platform.OS === 'web') {
      // 웹에서는 브라우저 다운로드 사용
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // 네이티브에서는 expo-file-system 사용
      const fileUri = FileSystem.documentDirectory + fileName;
      
      // 파일 쓰기
      await FileSystem.writeAsStringAsync(fileUri, jsonData, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // 공유 가능 여부 확인
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // 공유 시트 열기
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: '스케줄 내보내기',
        });
      } else {
        // 공유 불가능한 경우 파일 경로 알림
        console.log('File saved to:', fileUri);
        alert(`파일이 저장되었습니다: ${fileUri}`);
      }
    }
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

/**
 * 날짜 범위 지정하여 스케줄을 JSON으로 내보냅니다
 */
export async function exportSchedulesByDateRange(
  schedules: Schedule[],
  startDate: string,
  endDate: string
): Promise<void> {
  // 날짜 범위 필터링
  const filtered = schedules.filter((s) => {
    return s.date >= startDate && s.date <= endDate;
  });
  
  await exportSchedulesToJson(filtered);
}

/**
 * 특정 날짜의 스케줄을 JSON으로 내보냅니다
 */
export async function exportSchedulesByDate(
  schedules: Schedule[],
  date: string
): Promise<void> {
  // 날짜 필터링
  const filtered = schedules.filter((s) => s.date === date);
  
  await exportSchedulesToJson(filtered);
}
