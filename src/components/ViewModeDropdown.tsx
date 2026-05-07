import React, { useState, useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ui/ThemedText';
import { useScheduleStore } from '../store/scheduleStore';

interface ViewModeDropdownProps {
  value: 'daily' | 'weekly';
  onValueChange: (value: 'daily' | 'weekly') => void;
}

export function ViewModeDropdown({ value, onValueChange }: ViewModeDropdownProps) {
  const { colors } = useTheme();
  const { clockColor } = useScheduleStore();
  const [isOpen, setIsOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -10,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const handleSelect = (mode: 'daily' | 'weekly') => {
    onValueChange(mode);
    setIsOpen(false);
  };

  const displayText = value === 'daily' ? '일간' : '주간';

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.dropdownButton, { backgroundColor: colors.card }]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <ThemedText style={styles.dropdownText}>{displayText}</ThemedText>
        <ThemedText style={[styles.chevron, { transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }]}>
          ▼
        </ThemedText>
      </Pressable>

      {isOpen && (
        <Animated.View
          style={[
            styles.dropdown,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              backgroundColor: colors.card,
            },
          ]}
        >
          <Pressable
            style={styles.dropdownItem}
            onPress={() => handleSelect('daily')}
          >
            <ThemedText style={value === 'daily' && [styles.selectedText, { color: clockColor }]}>
              일간
            </ThemedText>
            {value === 'daily' && (
              <ThemedText style={[styles.checkmark, { color: clockColor }]}>✓</ThemedText>
            )}
          </Pressable>
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <Pressable
            style={styles.dropdownItem}
            onPress={() => handleSelect('weekly')}
          >
            <ThemedText style={value === 'weekly' && [styles.selectedText, { color: clockColor }]}>
              주간
            </ThemedText>
            {value === 'weekly' && (
              <ThemedText style={[styles.checkmark, { color: clockColor }]}>✓</ThemedText>
            )}
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 12,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 16,
    right: 16,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2000,
    backgroundColor: 'transparent',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  selectedText: {
    fontWeight: '700',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
  },
});
