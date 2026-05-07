import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ui/ThemedText';
import { getPointOnCircle } from '../../utils/arcMath';
import { useScheduleStore } from '../../store/scheduleStore';
import { updateSchedule } from '../../db/database';

// 배경색에 따라 텍스트 색상 결정 (흰색 또는 검정)
function getContrastColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// 완료된 스케줄용 색상 (검은색 대신 어두운 회색 계열)
const COMPLETED_BG_COLOR = '#374151'; // gray-700

const DIAL_SIZE = 380;
const CENTER = DIAL_SIZE / 2;
const OUTER_RADIUS = 165;
const INNER_RADIUS = 110;
const OUTER_LABEL_RADIUS = 185;
const INNER_LABEL_RADIUS = 90;
const OUTER_TRACK_RADIUS = 130;
const INNER_SCHEDULE_RADIUS = 55;
const MAX_BADGE_WIDTH = 100;

function hourToAngleIn12HourDial(hour: number) {
  const normalized = ((hour % 12) + 12) % 12;
  return -90 + (normalized / 12) * 360;
}

function currentTimeTo12HourAngle(totalMinutes: number) {
  const minutesIn12Hours = 12 * 60;
  const normalized = ((totalMinutes % minutesIn12Hours) + minutesIn12Hours) % minutesIn12Hours;
  return -90 + (normalized / minutesIn12Hours) * 360;
}

function getNowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// 텍스트가 길면 가운데 말줄임표로 표시
function truncateText(text: string, maxLength: number = 7): string {
  if (text.length <= maxLength) return text;
  if (maxLength <= 3) {
    return text.slice(0, maxLength) + '...';
  }
  const keep = maxLength - 3;
  const headLength = Math.ceil(keep / 2);
  const tailLength = Math.floor(keep / 2);
  return `${text.slice(0, headLength)}...${text.slice(text.length - tailLength)}`;
}

// 시계 숫자(시간 라벨)를 피하기 위한 각도 오프셋 계산
function getOffsetToAvoidHourLabels(angle: number, isOuter: boolean): number {
  // 12시간 기준 각도를 시간으로 변환 (-90도 시작)
  const normalizedAngle = ((angle + 90 + 360) % 360);
  const hourPosition = normalizedAngle / 30; // 30도 = 1시간
  
  // 가장 가까운 시간 라벨까지의 거리 (0~0.5)
  const distanceToHour = Math.abs(hourPosition - Math.round(hourPosition));
  
  // 시간 라벨과 가까우면 (±10도 이내) 오프셋 적용
  if (distanceToHour < 0.35) {
    const direction = (hourPosition % 1) < 0.5 ? -1 : 1;
    return direction * 12; // 12도 오프셋
  }
  return 0;
}

// HEX 색상의 채도를 줄이는 함수 (grayFactor: 0-1, 1이면 완전 회색)
function desaturateColor(hex: string, grayFactor: number = 0.7): string {
  // HEX를 RGB로 변환
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // RGB를 HSL로 변환
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  // 채도 감소: 색상을 회색으로 섞음
  const grayR = l;
  const grayG = l;
  const grayB = l;

  const newR = Math.round((r * (1 - grayFactor) + grayR * grayFactor) * 255);
  const newG = Math.round((g * (1 - grayFactor) + grayG * grayFactor) * 255);
  const newB = Math.round((b * (1 - grayFactor) + grayB * grayFactor) * 255);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

function parseTimeInput(value: string): number | null {
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour * 60 + minute;
}

function minutesToClockTime(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function angleToMinutesInDay(angle: number) {
  const normalized = ((angle + 90) % 360 + 360) % 360;
  return Math.round((normalized / 360) * 720) % 720;
}

function resolveOverlapLevel(items: { id: string; startMinutes: number; endMinutes: number }[]) {
  const sorted = [...items].sort((a, b) => a.startMinutes - b.startMinutes);
  const activeEndByLevel = [-1, -1, -1];
  const levelById: Record<string, number> = {};

  for (const item of sorted) {
    let level = 0;
    while (level < 3 && item.startMinutes < activeEndByLevel[level]) {
      level += 1;
    }
    level = Math.min(level, 2);
    activeEndByLevel[level] = Math.max(activeEndByLevel[level], item.endMinutes);
    levelById[item.id] = level;
  }

  return levelById;
}

export function RingDial() {
  const { colors } = useTheme();
  const router = useRouter();
  const { schedules, selectedDate, hasSeenCompletionNotice, setHasSeenCompletionNotice, loadSchedulesByDate, clockColor } = useScheduleStore();
  const [nowMinutes, setNowMinutes] = useState(getNowMinutes());
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedHourRange, setSelectedHourRange] = useState<{ start: number; end: number } | null>(null);
  const dialScale = useRef(new Animated.Value(1)).current;
  // 완료 알림 다이얼로그 상태
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(null);
  const [pendingCompleteDate, setPendingCompleteDate] = useState<string>('');

  // 시간대 클릭 핸들러 (케이크 조각 효과)
  // hour: 24는 자정(0시)을 의미 - 24:00~25:00(다음날 01:00)
  const handleHourClick = (hour: number, isOuter: boolean) => {
    // 24시는 0시로 변환 (자정)
    const normalizedHour = hour === 24 ? 0 : hour;
    const startMinutes = normalizedHour * 60;
    const endMinutes = (normalizedHour + 1) * 60;
    // 이미 선택된 시간대면 해제
    if (selectedHourRange?.start === startMinutes) {
      setSelectedHourRange(null);
    } else {
      setSelectedHourRange({ start: startMinutes, end: endMinutes });
    }
  };

  // 뱃지가 선택된 시간대에 속하는지 체크 (시간 범위 겹침 체크)
  const isInSelectedHourRange = (startMinutes: number, endMinutes: number) => {
    if (!selectedHourRange) return true; // 선택된게 없으면 모두 보임
    // 스케줄 시간 범위와 선택된 시간 범위가 겹치는지 확인
    const scheduleStartHour = Math.floor(startMinutes / 60);
    const scheduleEndHour = Math.floor((endMinutes - 1) / 60); // 종료 직전 시간
    const selectedHour = Math.floor(selectedHourRange.start / 60);
    // 시간 범위가 겹치는지 체크
    return scheduleStartHour <= selectedHour && selectedHour <= scheduleEndHour;
  };

  useEffect(() => {
    const id = setInterval(() => {
      setNowMinutes(getNowMinutes());
    }, 60 * 1000);

    return () => clearInterval(id);
  }, []);

  // 완료 알림 다이얼로그 확인 핸들러
  const handleDialogConfirm = async (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      setHasSeenCompletionNotice(true);
    }
    if (pendingCompleteId) {
      await updateSchedule(pendingCompleteId, { completed: true });
      await loadSchedulesByDate(pendingCompleteDate);
    }
    setShowCompletionDialog(false);
    setPendingCompleteId(null);
  };

  // const applyManualTime = () => {
  //   const parsed = parseTimeInput(manualInput);
  //   if (parsed === null) {
  //     setInputError('HH:mm 형식으로 입력해 주세요. 예: 08:30');
  //     return;
  //   }
  //   setManualMinutes(parsed);
  //   setInputError('');
  // };

  // const resetToNow = () => {
  //   setManualMinutes(null);
  //   setManualInput('');
  //   setInputError('');
  // };

  // const handleRingTap = (x: number, y: number) => {
  //   const dx = x - CENTER;
  //   const dy = y - CENTER;
  //   const radius = Math.hypot(dx, dy);
  //   const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  //   const baseMinutes = angleToMinutesInDay(angle);

  //   const isInnerTap = radius >= INNER_RADIUS - 14 && radius <= INNER_RADIUS + 14;
  //   const isOuterTap = radius >= OUTER_RADIUS - 16 && radius <= OUTER_RADIUS + 16;

  //   if (!isInnerTap && !isOuterTap) {
  //     setTapInfo('링 바깥을 탭했습니다. 안쪽/바깥 원을 눌러주세요.');
  //     return;
  //   }

  //   const resolvedMinutes = isOuterTap ? baseMinutes + 12 * 60 : baseMinutes;
  //   const ringName = isOuterTap ? '바깥 링(PM)' : '안쪽 링(AM)';
  //   setTapInfo(`${ringName} · ${minutesToClockTime(resolvedMinutes)} 선택`);

  //   Animated.sequence([
  //     Animated.timing(dialScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
  //     Animated.timing(dialScale, { toValue: 1, duration: 110, useNativeDriver: true }),
  //   ]).start();
  // };

  // outer 링 시간 레이블: 13~24 (13:00~24:00/00:00)
  const outerHourLabels = useMemo(
    () => Array.from({ length: 12 }, (_, index) => index + 13),
    []
  );
  const innerHourLabels = useMemo(
    () => Array.from({ length: 12 }, (_, index) => index + 1),
    []
  );
  const activeMinutes = nowMinutes; // manualMinutes ?? nowMinutes;
  const activeHour = Math.floor(activeMinutes / 60) % 24;
  const isOuterActive = activeHour >= 12;
  const handAngle = currentTimeTo12HourAngle(activeMinutes);
  const handRadius = isOuterActive ? OUTER_RADIUS - 10 : INNER_RADIUS - 8;
  const handEnd = getPointOnCircle(CENTER, CENTER, handRadius, handAngle);
  const handLength = Math.hypot(handEnd.x - CENTER, handEnd.y - CENTER);
  const handMidX = (CENTER + handEnd.x) / 2;
  const handMidY = (CENTER + handEnd.y) / 2;

  // DB에서 가져온 스케줄을 시간(분)으로 변환
  const schedulesWithMinutes = useMemo(() => {
    return schedules
      .filter(schedule => schedule.date === selectedDate)
      .map(schedule => {
        const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
        const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        return {
          ...schedule,
          startMinutes,
          endMinutes,
        };
      });
  }, [schedules, selectedDate]);

  // 안쪽 링(0-12시)과 바깥 링(12-24시)으로 분리
  const outerSchedules = useMemo(
    () => schedulesWithMinutes.filter(s => s.startMinutes >= 12 * 60),
    [schedulesWithMinutes]
  );
  const innerSchedules = useMemo(
    () => schedulesWithMinutes.filter(s => s.startMinutes < 12 * 60),
    [schedulesWithMinutes]
  );

  const outerOverlap = useMemo(() => resolveOverlapLevel(outerSchedules), [outerSchedules]);
  const innerOverlap = useMemo(() => resolveOverlapLevel(innerSchedules), [innerSchedules]);

  // 완료된 뱃지를 먼저 정렬 (아래에 배치되도록), 선택된 뱃지는 맨 위로
  const orderedOuterSchedules = useMemo(() => {
    const sorted = [...outerSchedules].sort((a, b) => {
      // 선택된 뱃지는 맨 위로
      if (a.id === selectedScheduleId) return 1;
      if (b.id === selectedScheduleId) return -1;
      // 완료된 뱃지는 아래로 (미완료가 위에)
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;
      return 0;
    });
    return sorted;
  }, [outerSchedules, selectedScheduleId]);

  const orderedInnerSchedules = useMemo(() => {
    const sorted = [...innerSchedules].sort((a, b) => {
      // 선택된 뱃지는 맨 위로
      if (a.id === selectedScheduleId) return 1;
      if (b.id === selectedScheduleId) return -1;
      // 완료된 뱃지는 아래로 (미완료가 위에)
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;
      return 0;
    });
    return sorted;
  }, [innerSchedules, selectedScheduleId]);

  // const applyManualTime = () => {
  //   const parsed = parseTimeInput(manualInput);
  //   if (parsed === null) {
  //     setInputError('HH:mm 형식으로 입력해 주세요. 예: 08:30');
  //     return;
  //   }
  //   setManualMinutes(parsed);
  //   setInputError('');
  // };

  // const resetToNow = () => {
  //   setManualMinutes(null);
  //   setManualInput('');
  //   setInputError('');
  // };

  // const handleRingTap = (x: number, y: number) => {
  //   const dx = x - CENTER;
  //   const dy = y - CENTER;
  //   const radius = Math.hypot(dx, dy);
  //   const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  //   const baseMinutes = angleToMinutesInDay(angle);

  //   const isInnerTap = radius >= INNER_RADIUS - 14 && radius <= INNER_RADIUS + 14;
  //   const isOuterTap = radius >= OUTER_RADIUS - 16 && radius <= OUTER_RADIUS + 16;

  //   if (!isInnerTap && !isOuterTap) {
  //     setTapInfo('링 바깥을 탭했습니다. 안쪽/바깥 원을 눌러주세요.');
  //     return;
  //   }

  //   const resolvedMinutes = isOuterTap ? baseMinutes + 12 * 60 : baseMinutes;
  //   const ringName = isOuterTap ? '바깥 링(PM)' : '안쪽 링(AM)';
  //   setTapInfo(`${ringName} · ${minutesToClockTime(resolvedMinutes)} 선택`);

  //   Animated.sequence([
  //     Animated.timing(dialScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
  //     Animated.timing(dialScale, { toValue: 1, duration: 110, useNativeDriver: true }),
  //   ]).start();
  // };

  return (
    <View style={[styles.container, { pointerEvents: 'box-none' }] }>
      <Animated.View style={[styles.wrapper, { borderColor: colors.border, transform: [{ scale: dialScale }] }]}>
        {/* <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(e) => handleRingTap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        /> */}
        <View
          style={[
            styles.outerRing,
            {
              borderColor: isOuterActive ? clockColor : colors.border,
            },
          ]}
        />
        <View
          style={[
            styles.innerRing,
            {
              borderColor: isOuterActive ? colors.border : clockColor,
            },
          ]}
        />

        {outerHourLabels.map((hour) => {
          const angle = hourToAngleIn12HourDial(hour - 12);
          const point = getPointOnCircle(CENTER, CENTER, OUTER_LABEL_RADIUS, angle);
          const isSelected = selectedHourRange?.start === hour * 60;
          return (
            <Pressable
              key={`outer-${hour}`}
              onPress={() => handleHourClick(hour, true)}
              style={[
                styles.labelContainer,
                {
                  left: point.x - 16,
                  top: point.y - 14,
                  zIndex: 60,
                  backgroundColor: isSelected ? clockColor : 'transparent',
                  borderRadius: 12,
                  padding: 4,
                  minWidth: 28,
                  alignItems: 'center',
                },
              ]}
            >
              <ThemedText style={[styles.outerLabelText, isSelected && { color: '#fff', fontWeight: 'bold' }]}>
                {hour}
              </ThemedText>
            </Pressable>
          );
        })}

        {innerHourLabels.map((hour) => {
          const angle = hourToAngleIn12HourDial(hour);
          const point = getPointOnCircle(CENTER, CENTER, INNER_LABEL_RADIUS, angle);
          const isSelected = selectedHourRange?.start === hour * 60;
          return (
            <Pressable
              key={`inner-${hour}`}
              onPress={() => handleHourClick(hour, false)}
              style={[
                styles.labelContainer,
                {
                  left: point.x - 16,
                  top: point.y - 11,
                  zIndex: 60,
                  backgroundColor: isSelected ? clockColor : 'transparent',
                  borderRadius: 12,
                  padding: 4,
                  minWidth: 28,
                  alignItems: 'center',
                },
              ]}
            >
              <ThemedText style={[styles.innerLabelText, isSelected && { color: '#fff', fontWeight: 'bold' }]}>
                {hour}
              </ThemedText>
            </Pressable>
          );
        })}

        {orderedOuterSchedules.map((item) => {
          const mid = (item.startMinutes + item.endMinutes) / 2;
          let angle = hourToAngleIn12HourDial(mid / 60 - 12);
          // 시계 숫자 피하기 위해 각도 조정
          angle += getOffsetToAvoidHourLabels(angle, true);
          const level = outerOverlap[item.id] ?? 0;
          // 한 시간당 3개일 때 균등 배치: 레벨 0,1,2를 -16, 0, +16으로 배치
          const spreadOffsets = [-16, 0, 16];
          const point = getPointOnCircle(CENTER, CENTER, OUTER_TRACK_RADIUS - level * 11, angle);
          const radians = (angle * Math.PI) / 180;
          const tangentX = -Math.sin(radians);
          const tangentY = Math.cos(radians);
          const spread = spreadOffsets[level] || 0;
          const label = item.title;
          const isSelectedSchedule = selectedScheduleId === item.id;
          const isPast = item.endMinutes < nowMinutes;
          const isCompleted = item.completed;
          const isNewlyCreated = false;
          // 시간대 선택 효과
          const inSelectedRange = isInSelectedHourRange(item.startMinutes, item.endMinutes);
          const isDimmed = selectedHourRange && !inSelectedRange;
          // 완료된 스케줄은 어두운 회색, 미완료+지난시간은 50% 채도 감소
          const bgColor = isCompleted ? COMPLETED_BG_COLOR : isPast ? desaturateColor(item.color, 0.8) : item.color;
          const textColor = getContrastColor(bgColor);
          const displayLabel = truncateText(label, 7);
          const lines = displayLabel.split('\n');
          const minWidth = level === 0 ? 56 : 48;
          const maxLineLength = Math.max(...lines.map(line => line.length));
          const badgeWidth = Math.min(MAX_BADGE_WIDTH, Math.max(minWidth, maxLineLength * 7 + 18));
          const badgeHeight = 12 + Math.min(lines.length, 2) * 12;
          const loadSchedulesByDate = useScheduleStore.getState().loadSchedulesByDate;

          const handleToggleComplete = async (e: any) => {
            e.stopPropagation();
            const newCompleted = !isCompleted;
            // 완료 체크 시 다이얼로그 표시 (미완료로 변경 시는 바로 처리)
            if (newCompleted && !hasSeenCompletionNotice) {
              setPendingCompleteId(item.id);
              setPendingCompleteDate(item.date);
              setShowCompletionDialog(true);
              return;
            }
            await updateSchedule(item.id, { completed: newCompleted });
            await loadSchedulesByDate(item.date);
          };

          return (
            <Pressable
              onPress={() => router.push({ pathname: '/detail', params: { id: item.id } })}
              key={item.id}
              style={[
                styles.scheduleBadge,
                {
                  left: point.x - badgeWidth / 2 + tangentX * (spread + (isSelectedSchedule ? 10 : 0)),
                  top: point.y - badgeHeight / 2 + tangentY * (spread + (isSelectedSchedule ? 10 : 0)),
                  backgroundColor: bgColor,
                  width: badgeWidth,
                  height: badgeHeight,
                  zIndex: isNewlyCreated ? 30 : isSelectedSchedule ? 25 : inSelectedRange ? 15 : 5 - level,
                  transform: [{ scale: isDimmed ? 0.85 : isNewlyCreated || isSelectedSchedule ? 1.1 : 1 }],
                  opacity: isDimmed ? 0.3 : 1,
                  borderWidth: isNewlyCreated ? 2 : 0,
                  borderColor: '#FFFFFF',
                },
              ]}
            >
              <View style={styles.badgeContent}>
                <Pressable onPress={handleToggleComplete} style={styles.checkboxContainer} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
                    {isCompleted && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                  </View>
                </Pressable>
                <ThemedText style={[styles.scheduleText, { color: textColor }]} numberOfLines={1} ellipsizeMode="middle">
                  {displayLabel}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}

        {orderedInnerSchedules.map((item) => {
          const mid = (item.startMinutes + item.endMinutes) / 2;
          let angle = hourToAngleIn12HourDial(mid / 60);
          // 시계 숫자 피하기 위해 각도 조정
          angle += getOffsetToAvoidHourLabels(angle, false);
          const level = innerOverlap[item.id] ?? 0;
          // 한 시간당 3개일 때 균등 배치: 레벨 0,1,2를 -14, 0, +14으로 배치
          const spreadOffsets = [-14, 0, 14];
          // 안쪽 뱃지를 더 안쪽으로 배치 (시간 레이블과 겹치지 않게)
          const point = getPointOnCircle(CENTER, CENTER, INNER_SCHEDULE_RADIUS - level * 10, angle);
          const radians = (angle * Math.PI) / 180;
          const tangentX = -Math.sin(radians);
          const tangentY = Math.cos(radians);
          const spread = spreadOffsets[level] || 0;
          const label = item.title;
          const isSelectedSchedule = selectedScheduleId === item.id;
          const isPast = item.endMinutes < nowMinutes;
          const isCompleted = item.completed;
          const isNewlyCreated = false;
          // 시간대 선택 효과
          const inSelectedRange = isInSelectedHourRange(item.startMinutes, item.endMinutes);
          const isDimmed = selectedHourRange && !inSelectedRange;
          // 완료된 스케줄은 어두운 회색, 미완료+지난시간은 50% 채도 감소
          const bgColor = isCompleted ? COMPLETED_BG_COLOR : isPast ? desaturateColor(item.color, 0.8) : item.color;
          const textColor = getContrastColor(bgColor);
          const displayLabel = truncateText(label, 7);
          const lines = displayLabel.split('\n');
          const minWidth = level === 0 ? 56 : 48;
          const maxLineLength = Math.max(...lines.map(line => line.length));
          const badgeWidth = Math.min(MAX_BADGE_WIDTH, Math.max(minWidth, maxLineLength * 7 + 18));
          const badgeHeight = 12 + Math.min(lines.length, 2) * 12;
          const loadSchedulesByDate = useScheduleStore.getState().loadSchedulesByDate;

          const handleToggleComplete = async (e: any) => {
            e.stopPropagation();
            const newCompleted = !isCompleted;
            // 완료 체크 시 다이얼로그 표시 (미완료로 변경 시는 바로 처리)
            if (newCompleted && !hasSeenCompletionNotice) {
              setPendingCompleteId(item.id);
              setPendingCompleteDate(item.date);
              setShowCompletionDialog(true);
              return;
            }
            await updateSchedule(item.id, { completed: newCompleted });
            await loadSchedulesByDate(item.date);
          };

          return (
            <Pressable
              onPress={() => router.push({ pathname: '/detail', params: { id: item.id } })}
              key={item.id}
              style={[
                styles.scheduleBadge,
                {
                  left: point.x - badgeWidth / 2 + tangentX * (spread + (isSelectedSchedule ? 8 : 0)),
                  top: point.y - badgeHeight / 2 + tangentY * (spread + (isSelectedSchedule ? 8 : 0)),
                  backgroundColor: bgColor,
                  width: badgeWidth,
                  height: badgeHeight,
                  zIndex: isNewlyCreated ? 30 : isSelectedSchedule ? 25 : inSelectedRange ? 15 : 5 - level,
                  transform: [{ scale: isDimmed ? 0.85 : isNewlyCreated || isSelectedSchedule ? 1.1 : 1 }],
                  opacity: isDimmed ? 0.3 : 1,
                  borderWidth: isNewlyCreated ? 2 : 0,
                  borderColor: '#FFFFFF',
                },
              ]}
            >
              <View style={styles.badgeContent}>
                <Pressable onPress={handleToggleComplete} style={styles.checkboxContainer} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
                    {isCompleted && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                  </View>
                </Pressable>
                <ThemedText style={[styles.scheduleText, { color: textColor }]} numberOfLines={1} ellipsizeMode="middle">
                  {displayLabel}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}

        <View
          style={[
            styles.hand,
            {
              backgroundColor: clockColor,
              width: handLength,
              left: handMidX - handLength / 2,
              top: handMidY - 1,
              transform: [{ rotate: `${handAngle}deg` }],
              zIndex: 100,
            },
          ]}
        />
        <View style={[styles.centerDot, { backgroundColor: clockColor, zIndex: 100 }]} />
      </Animated.View>

      {/* 테스트 컨트롤 - 나중에 사용 가능 */}
      {/*
      <View style={styles.controls}>
        <TextInput
          value={manualInput}
          onChangeText={setManualInput}
          placeholder="HH:mm"
          placeholderTextColor={colors.mutedText}
          style={[
            styles.input,
            {
              borderColor: colors.border,
              color: colors.text,
              backgroundColor: colors.card,
            },
          ]}
        />
        <View style={styles.buttonsRow}>
          <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={applyManualTime}>
            <ThemedText style={styles.buttonText}>테스트 시간 적용</ThemedText>
          </Pressable>
          <Pressable style={[styles.button, styles.ghostButton, { borderColor: colors.border }]} onPress={resetToNow}>
            <ThemedText style={styles.ghostButtonText}>현재로 복귀</ThemedText>
          </Pressable>
        </View>
      </View>

      <ThemedText muted style={styles.tapInfoText}>
        {tapInfo}
      </ThemedText>
      {inputError ? <ThemedText style={styles.errorText}>{inputError}</ThemedText> : null}
      */}

      {/* 완료 알림 다이얼로그 */}
      {showCompletionDialog && (
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogContainer, { backgroundColor: colors.card }]}>
            <ThemedText style={[styles.dialogTitle, { color: colors.text }]}>스케줄 완료</ThemedText>
            <ThemedText muted style={styles.dialogMessage}>완료된 스케줄은 맨뒤로 정렬됩니다.</ThemedText>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => handleDialogConfirm(true)}
                style={[styles.dialogButton, { backgroundColor: colors.border }]}
              >
                <ThemedText style={{ fontWeight: '600', fontSize: 14, color: colors.text }}>다시 보지 않기</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleDialogConfirm(false)}
                style={[styles.dialogButton, { backgroundColor: clockColor }]}
              >
                <ThemedText style={{ fontWeight: '600', fontSize: 14, color: getContrastColor(clockColor) }}>확인</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: -20,
  },
  wrapper: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
  },
  outerRing: {
    position: 'absolute',
    width: OUTER_RADIUS * 2,
    height: OUTER_RADIUS * 2,
    borderRadius: OUTER_RADIUS,
    borderWidth: 12,
  },
  innerRing: {
    position: 'absolute',
    width: INNER_RADIUS * 2,
    height: INNER_RADIUS * 2,
    borderRadius: INNER_RADIUS,
    borderWidth: 10,
  },
  labelContainer: {
    position: 'absolute',
    width: 24,
    alignItems: 'center',
  },
  outerLabelText: {
    fontSize: 12,
    lineHeight: 16,
  },
  innerLabelText: {
    fontSize: 11,
    lineHeight: 14,
  },
  hand: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
  },
  centerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
  },
  controls: {
    marginTop: 12,
    alignItems: 'center',
    gap: 8,
  },
  input: {
    width: 180,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 14,
  },
  ghostButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  ghostButtonText: {
    fontSize: 12,
    lineHeight: 14,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 14,
    color: '#DC2626',
  },
  tapInfoText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
  },
  scheduleBadge: {
    position: 'absolute',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    width: '100%',
    paddingLeft: 3,
    paddingRight: 4,
  },
  checkboxContainer: {
    padding: 1,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FFFFFF',
  },
  checkmark: {
    color: '#000000',
    fontSize: 7,
    fontWeight: 'bold',
    lineHeight: 10,
  },
  scheduleText: {
    flexShrink: 1,
    flexWrap: 'wrap',
    fontSize: 8,
    lineHeight: 10,
    textAlign: 'left',
    fontWeight: '500',
  },
  // 다이얼로그 스타일
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialogContainer: {
    borderRadius: 12,
    padding: 24,
    width: 280,
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  dialogMessage: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
});
