import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ui/ThemedText';
import { useScheduleStore } from '../store/scheduleStore';

interface ViewModeRadioProps {
  value: 'daily' | 'weekly';
  onValueChange: (value: 'daily' | 'weekly') => void;
}

export function ViewModeRadio({ value, onValueChange }: ViewModeRadioProps) {
  const { colors } = useTheme();
  const { clockColor } = useScheduleStore();

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.radioOption,
          value === 'daily' && [styles.selectedOption, { borderColor: clockColor }]
        ]}
        onPress={() => onValueChange('daily')}
      >
        <View style={[
          styles.radioCircle,
          value === 'daily' && [styles.selectedCircle, { backgroundColor: clockColor }]
        ]}>
          {value === 'daily' && <View style={styles.radioDot} />}
        </View>
        <ThemedText style={[
          styles.radioText,
          value === 'daily' && styles.selectedText
        ]}>
          일간
        </ThemedText>
      </Pressable>

      <Pressable
        style={[
          styles.radioOption,
          value === 'weekly' && [styles.selectedOption, { borderColor: clockColor }]
        ]}
        onPress={() => onValueChange('weekly')}
      >
        <View style={[
          styles.radioCircle,
          value === 'weekly' && [styles.selectedCircle, { backgroundColor: clockColor }]
        ]}>
          {value === 'weekly' && <View style={styles.radioDot} />}
        </View>
        <ThemedText style={[
          styles.radioText,
          value === 'weekly' && styles.selectedText
        ]}>
          주간
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  selectedOption: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCircle: {
    borderColor: 'transparent',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedText: {
    fontWeight: '700',
  },
});
