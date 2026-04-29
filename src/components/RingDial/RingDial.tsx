import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ui/ThemedText';
import { getPointOnCircle } from '../../utils/arcMath';

const DIAL_SIZE = 300;
const CENTER = DIAL_SIZE / 2;
const OUTER_RADIUS = 130;
const INNER_RADIUS = 95;
const OUTER_LABEL_RADIUS = 145;
const INNER_LABEL_RADIUS = 80;

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

export function RingDial() {
  const { colors } = useTheme();
  const [nowMinutes, setNowMinutes] = useState(getNowMinutes());
  const [manualInput, setManualInput] = useState('');
  const [manualMinutes, setManualMinutes] = useState<number | null>(null);
  const [inputError, setInputError] = useState('');

  useEffect(() => {
    const id = setInterval(() => {
      setNowMinutes(getNowMinutes());
    }, 60 * 1000);

    return () => clearInterval(id);
  }, []);

  const outerHourLabels = useMemo(
    () => Array.from({ length: 12 }, (_, index) => index + 13),
    []
  );
  const innerHourLabels = useMemo(
    () => Array.from({ length: 12 }, (_, index) => index + 1),
    []
  );
  const activeMinutes = manualMinutes ?? nowMinutes;
  const activeHour = Math.floor(activeMinutes / 60) % 24;
  const isOuterActive = activeHour >= 12;
  const handAngle = currentTimeTo12HourAngle(activeMinutes);
  const handRadius = isOuterActive ? OUTER_RADIUS - 10 : INNER_RADIUS - 8;
  const handEnd = getPointOnCircle(CENTER, CENTER, handRadius, handAngle);
  const handLength = Math.hypot(handEnd.x - CENTER, handEnd.y - CENTER);
  const handMidX = (CENTER + handEnd.x) / 2;
  const handMidY = (CENTER + handEnd.y) / 2;

  const applyManualTime = () => {
    const parsed = parseTimeInput(manualInput);
    if (parsed === null) {
      setInputError('HH:mm 형식으로 입력해 주세요. 예: 08:30');
      return;
    }
    setManualMinutes(parsed);
    setInputError('');
  };

  const resetToNow = () => {
    setManualMinutes(null);
    setManualInput('');
    setInputError('');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.wrapper, { borderColor: colors.border }]}>
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
      </View>

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

      {inputError ? <ThemedText style={styles.errorText}>{inputError}</ThemedText> : null}
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
});
