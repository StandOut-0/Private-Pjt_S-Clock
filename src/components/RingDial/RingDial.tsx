import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ui/ThemedText';
import { getPointOnCircle } from '../../utils/arcMath';

const DIAL_SIZE = 380;
const CENTER = DIAL_SIZE / 2;
const OUTER_RADIUS = 165;
const INNER_RADIUS = 110;
const OUTER_LABEL_RADIUS = 185;
const INNER_LABEL_RADIUS = 90;
const OUTER_TRACK_RADIUS = 150;
const INNER_TRACK_RADIUS = 85;

type DummySchedule = {
  id: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
  color: string;
  isPast?: boolean;
};

// 색상을 채도만 낮춘 회색 버전으로 변환
function desaturateColor(color: string, factor: number = 0.3): string {
  // HEX를 RGB로 변환
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 명도(lightness) 계산
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2 / 255;

  // 회색으로 변환 (명도 유지, 채도 0)
  const gray = Math.round(lightness * 255);

  // 원래 색상과 회색을 섞기
  const mixedR = Math.round(r * factor + gray * (1 - factor));
  const mixedG = Math.round(g * factor + gray * (1 - factor));
  const mixedB = Math.round(b * factor + gray * (1 - factor));

  return `#${mixedR.toString(16).padStart(2, '0')}${mixedG.toString(16).padStart(2, '0')}${mixedB.toString(16).padStart(2, '0')}`;
}

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

function resolveOverlapLevel(items: DummySchedule[]) {
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
  const [nowMinutes, setNowMinutes] = useState(getNowMinutes());
  // const [manualInput, setManualInput] = useState('');
  // const [manualMinutes, setManualMinutes] = useState<number | null>(null);
  // const [inputError, setInputError] = useState('');
  // const [tapInfo, setTapInfo] = useState('링을 탭하면 시간 계산 결과가 표시됩니다.');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const dialScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const id = setInterval(() => {
      setNowMinutes(getNowMinutes());
    }, 60 * 1000);

    return () => clearInterval(id);
  }, []);

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
  const outerSchedules: DummySchedule[] = useMemo(
    () => [
      { id: 'o1', title: 'Lunch', startMinutes: 12 * 60 + 30, endMinutes: 13 * 60 + 30, color: '#3B82F6' },
      { id: 'o2', title: 'Call', startMinutes: 13 * 60, endMinutes: 14 * 60 + 30, color: '#8B5CF6' },
      { id: 'o3', title: 'Study', startMinutes: 13 * 60 + 20, endMinutes: 15 * 60, color: '#10B981' },
    ].map(item => ({
      ...item,
      isPast: item.endMinutes <= nowMinutes, // 현재 시간보다 전에 끝남
    })),
    [nowMinutes]
  );
  const innerSchedules: DummySchedule[] = useMemo(
    () => [
      { id: 'i1', title: 'Deep Work', startMinutes: 1 * 60, endMinutes: 2 * 60 + 30, color: '#F59E0B' },
      { id: 'i2', title: 'Exercise', startMinutes: 1 * 60 + 15, endMinutes: 2 * 60, color: '#EF4444' },
      { id: 'i3', title: 'Reading', startMinutes: 3 * 60, endMinutes: 4 * 60, color: '#06B6D4' },
    ].map(item => ({
      ...item,
      isPast: item.endMinutes <= nowMinutes, // 현재 시간보다 전에 끝남
    })),
    [nowMinutes]
  );
  const outerOverlap = useMemo(() => resolveOverlapLevel(outerSchedules), [outerSchedules]);
  const innerOverlap = useMemo(() => resolveOverlapLevel(innerSchedules), [innerSchedules]);
  const orderedOuterSchedules = useMemo(() => {
    if (!selectedScheduleId) {
      return outerSchedules;
    }
    return [...outerSchedules].sort((a, b) => (a.id === selectedScheduleId ? 1 : b.id === selectedScheduleId ? -1 : 0));
  }, [outerSchedules, selectedScheduleId]);
  const orderedInnerSchedules = useMemo(() => {
    if (!selectedScheduleId) {
      return innerSchedules;
    }
    return [...innerSchedules].sort((a, b) => (a.id === selectedScheduleId ? 1 : b.id === selectedScheduleId ? -1 : 0));
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
    <View style={styles.container}>
      <Animated.View style={[styles.wrapper, { borderColor: colors.border, transform: [{ scale: dialScale }] }]}>
        {/* <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(e) => handleRingTap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        /> */}
        <View
          style={[
            styles.outerRing,
            {
              borderColor: isOuterActive ? colors.primary : colors.border,
            },
          ]}
        />
        <View
          style={[
            styles.innerRing,
            {
              borderColor: isOuterActive ? colors.border : colors.primary,
            },
          ]}
        />

        {outerHourLabels.map((hour) => {
          const angle = hourToAngleIn12HourDial(hour - 12);
          const point = getPointOnCircle(CENTER, CENTER, OUTER_LABEL_RADIUS, angle);
          return (
            <View
              key={`outer-${hour}`}
              style={[
                styles.labelContainer,
                {
                  left: point.x - 12,
                  top: point.y - 10,
                },
              ]}
            >
              <ThemedText style={styles.outerLabelText}>{hour}</ThemedText>
            </View>
          );
        })}

        {innerHourLabels.map((hour) => {
          const angle = hourToAngleIn12HourDial(hour);
          const point = getPointOnCircle(CENTER, CENTER, INNER_LABEL_RADIUS, angle);
          return (
            <View
              key={`inner-${hour}`}
              style={[
                styles.labelContainer,
                {
                  left: point.x - 12,
                  top: point.y - 10,
                },
              ]}
            >
              <ThemedText style={styles.innerLabelText}>{hour}</ThemedText>
            </View>
          );
        })}

        {orderedOuterSchedules.map((item) => {
          const mid = (item.startMinutes + item.endMinutes) / 2;
          const angle = hourToAngleIn12HourDial(mid / 60 - 12);
          const level = outerOverlap[item.id] ?? 0;
          const point = getPointOnCircle(CENTER, CENTER, OUTER_TRACK_RADIUS - level * 11, angle);
          const radians = (angle * Math.PI) / 180;
          const tangentX = -Math.sin(radians);
          const tangentY = Math.cos(radians);
          const spread = (level - 1) * 14;
          const label = level === 0 ? item.title : item.title.slice(0, 3);
          const isSelected = selectedScheduleId === item.id;
          const badgeColor = item.isPast ? desaturateColor(item.color, 0.25) : item.color;
          return (
            <Pressable
              onPress={() => setSelectedScheduleId(item.id)}
              key={item.id}
              style={[
                styles.scheduleBadge,
                {
                  left: point.x - 28 + tangentX * (spread + (isSelected ? 10 : 0)),
                  top: point.y - 9 + tangentY * (spread + (isSelected ? 10 : 0)),
                  backgroundColor: badgeColor,
                  width: level === 0 ? 56 : 42,
                  opacity: isSelected || level === 0 ? 1 : 0.88,
                  zIndex: isSelected ? 20 : 10 - level,
                  transform: [{ scale: isSelected ? 1.08 : 1 }],
                },
              ]}
            >
              <ThemedText style={styles.scheduleText}>{label}</ThemedText>
            </Pressable>
          );
        })}

        {orderedInnerSchedules.map((item) => {
          const mid = (item.startMinutes + item.endMinutes) / 2;
          const angle = hourToAngleIn12HourDial(mid / 60);
          const level = innerOverlap[item.id] ?? 0;
          const point = getPointOnCircle(CENTER, CENTER, INNER_TRACK_RADIUS - level * 10, angle);
          const radians = (angle * Math.PI) / 180;
          const tangentX = -Math.sin(radians);
          const tangentY = Math.cos(radians);
          const spread = (level - 1) * 12;
          const label = level === 0 ? item.title : item.title.slice(0, 3);
          const isSelected = selectedScheduleId === item.id;
          const badgeColor = item.isPast ? desaturateColor(item.color, 0.25) : item.color;
          return (
            <Pressable
              onPress={() => setSelectedScheduleId(item.id)}
              key={item.id}
              style={[
                styles.scheduleBadge,
                {
                  left: point.x - 28 + tangentX * (spread + (isSelected ? 8 : 0)),
                  top: point.y - 9 + tangentY * (spread + (isSelected ? 8 : 0)),
                  backgroundColor: badgeColor,
                  width: level === 0 ? 56 : 40,
                  opacity: isSelected || level === 0 ? 1 : 0.88,
                  zIndex: isSelected ? 20 : 10 - level,
                  transform: [{ scale: isSelected ? 1.08 : 1 }],
                },
              ]}
            >
              <ThemedText style={styles.scheduleText}>{label}</ThemedText>
            </Pressable>
          );
        })}

        <View
          style={[
            styles.hand,
            {
              backgroundColor: colors.primary,
              width: handLength,
              left: handMidX - handLength / 2,
              top: handMidY - 1,
              transform: [{ rotate: `${handAngle}deg` }],
            },
          ]}
        />
        <View style={[styles.centerDot, { backgroundColor: colors.primary }]} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
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
    width: 56,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  scheduleText: {
    color: '#FFFFFF',
    fontSize: 9,
    lineHeight: 11,
  },
});
