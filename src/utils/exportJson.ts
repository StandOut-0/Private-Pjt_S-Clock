import * as FileSystem from 'expo-file-system';
// @ts-ignore - expo-sharing includes its own types
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform, Alert } from 'react-native';
import { Schedule, getAllSchedules, createSchedule, updateSchedule, getScheduleById } from '../db/database';

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

/**
 * JSON 파일에서 스케줄을 가져와서 데이터베이스에 import 합니다
 */
export async function importSchedulesFromJson(): Promise<{
  imported: number;
  skipped: number;
  updated: number;
}> {
  try {
    if (Platform.OS === 'web') {
      // 웹에서는 file input 사용
      return await importSchedulesFromJsonWeb();
    } else {
      // 네이티브에서는 DocumentPicker 사용
      return await importSchedulesFromJsonNative();
    }
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

/**
 * 웹 환경에서 JSON 파일 import
 */
async function importSchedulesFromJsonWeb(): Promise<{
  imported: number;
  skipped: number;
  updated: number;
}> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      try {
        const text = await file.text();
        const importedSchedules: Schedule[] = JSON.parse(text);
        const result = await processImportedSchedules(importedSchedules);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    input.click();
  });
}

/**
 * 네이티브 환경에서 JSON 파일 import
 */
async function importSchedulesFromJsonNative(): Promise<{
  imported: number;
  skipped: number;
  updated: number;
}> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json'],
    copyToCacheDirectory: true,
  });
  
  if (result.canceled || !result.assets || result.assets.length === 0) {
    throw new Error('File selection cancelled');
  }
  
  const asset = result.assets[0];
  const content = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  
  const importedSchedules: Schedule[] = JSON.parse(content);
  return await processImportedSchedules(importedSchedules);
}

/**
 * 가져온 스케줄 데이터를 처리하고 중복 확인
 */
async function processImportedSchedules(
  importedSchedules: Schedule[]
): Promise<{
  imported: number;
  skipped: number;
  updated: number;
}> {
  const result = {
    imported: 0,
    skipped: 0,
    updated: 0,
  };
  
  const existingSchedules = await getAllSchedules();
  console.log('🔍 현재 데이터베이스 스케줄 수:', existingSchedules.length);
  const existingIds = new Set(existingSchedules.map(s => s.id));
  console.log('🔍 가져올 스케줄 수:', importedSchedules.length);
  const duplicates: string[] = [];
  
  for (const schedule of importedSchedules) {
    // 데이터 유효성 검사
    if (!isValidSchedule(schedule)) {
      result.skipped++;
      continue;
    }
    
    if (existingIds.has(schedule.id)) {
      // 중복 데이터 - 기존 데이터와 비교
      console.log(`🔄 중복 ID 발견: ${schedule.title} (${schedule.date})`);
      const existing = await getScheduleById(schedule.id);
      if (existing) {
        // 업데이트할지 확인
        const isDifferent = JSON.stringify(existing) !== JSON.stringify(schedule);
        if (isDifferent) {
          console.log(`📝 내용 다름 - 덮어쓰기: ${schedule.title}`);
          duplicates.push(schedule.title);
          // 여기서는 덮어쓰기로 처리
          await updateSchedule(schedule.id, {
            title: schedule.title,
            date: schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            color: schedule.color,
            memo: schedule.memo,
          });
          result.updated++;
        } else {
          console.log(`⏭️ 내용 동일 - 건너뛰기: ${schedule.title}`);
          result.skipped++;
        }
      }
    } else {
      // 새로운 데이터 - 생성
      console.log(`➕ 새로운 데이터 추가: ${schedule.title} (${schedule.date})`);
      await createSchedule(schedule);
      result.imported++;
    }
  }
  
  // 중복된 데이터가 있었다면 사용자에게 알림
  if (duplicates.length > 0) {
    const message = `${duplicates.length}개의 중복된 데이터가 발견되어 덮어쓰기되었습니다:\n${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? '...' : ''}`;
    
    if (Platform.OS === 'web') {
      alert(message);
    } else {
      Alert.alert('데이터 덮어쓰기', message);
    }
  }
  
  return result;
}

/**
 * 스케줄 데이터 유효성 검사
 */
function isValidSchedule(schedule: any): schedule is Schedule {
  return (
    schedule &&
    typeof schedule.id === 'string' &&
    typeof schedule.title === 'string' &&
    typeof schedule.date === 'string' &&
    typeof schedule.startTime === 'string' &&
    typeof schedule.endTime === 'string' &&
    typeof schedule.color === 'string' &&
    typeof schedule.createdAt === 'number' &&
    typeof schedule.updatedAt === 'number' &&
    // 날짜 형식 검증 (yyyy-mm-dd)
    /^\d{4}-\d{2}-\d{2}$/.test(schedule.date) &&
    // 시간 형식 검증 (HH:mm)
    /^\d{2}:\d{2}$/.test(schedule.startTime) &&
    /^\d{2}:\d{2}$/.test(schedule.endTime) &&
    // 색상 형식 검증 (hex)
    /^#[0-9A-Fa-f]{6}$/.test(schedule.color)
  );
}
