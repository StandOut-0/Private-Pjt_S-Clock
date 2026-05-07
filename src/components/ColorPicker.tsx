import { useState } from 'react';
import { StyleSheet, View, Pressable, TextInput, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ui/ThemedText';
import {
  PRESET_COLORS,
  checkDarkModeReadability,
  hexToHsl,
  hslToHex,
  getContrastTextColor,
} from '../utils/colorGen';

interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

export function ColorPicker({ selectedColor, onSelectColor }: ColorPickerProps) {
  const { colors } = useTheme();
  const [customHex, setCustomHex] = useState(selectedColor.replace('#', ''));
  const [hslValues, setHslValues] = useState(hexToHsl(selectedColor));
  
  // 선택된 색상에 따른 텍스트 색상 결정
  const textColor = colors.text; // 테마 색상 사용 (다크모드 대응)

  // 커스텀 hex 입력 처리
  const handleCustomHexChange = (text: string) => {
    const cleanText = text.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    setCustomHex(cleanText);

    if (cleanText.length === 6) {
      const hex = `#${cleanText.toUpperCase()}`;
      const readability = checkDarkModeReadability(hex);

      if (!readability.isReadable) {
        Alert.alert('색상 경고', readability.warning || '이 색상은 가독성이 낮을 수 있습니다.');
      }

      onSelectColor(hex);
      setHslValues(hexToHsl(hex));
    }
  };

  // HSL 슬라이더 조정
  const handleHslChange = (key: 'h' | 's' | 'l', value: number) => {
    const newHsl = { ...hslValues, [key]: value };
    setHslValues(newHsl);
    const hex = hslToHex(newHsl);
    setCustomHex(hex.replace('#', ''));
    onSelectColor(hex);
  };

  const readability = checkDarkModeReadability(selectedColor);

  return (
    <View style={styles.container}>
      {/* 프리셋 팔레트 */}
      <View style={styles.presetContainer}>
        {PRESET_COLORS.map((color) => (
          <Pressable
            key={color}
            onPress={() => {
              onSelectColor(color);
              setCustomHex(color.replace('#', ''));
              setHslValues(hexToHsl(color));
            }}
            style={[
              styles.presetColor,
              { backgroundColor: color },
              selectedColor === color && styles.selectedPreset,
            ]}
          >
            {selectedColor === color && (
              <View style={styles.checkmark}>
                <ThemedText style={styles.checkmarkText}>✓</ThemedText>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* 커스텀 Hex 입력 */}
      <View style={styles.customSection}>
        <ThemedText style={styles.label}>직접 입력 (HEX)</ThemedText>
        <View style={styles.hexInputContainer}>
          <ThemedText style={styles.hexPrefix}>#</ThemedText>
          <TextInput
            value={customHex}
            onChangeText={handleCustomHexChange}
            style={[styles.hexInput, { borderColor: colors.border, color: colors.text }]}
            maxLength={6}
            autoCapitalize="characters"
          />
          <View
            style={[styles.colorPreview, { backgroundColor: selectedColor }]}
          />
        </View>
      </View>

      {/* HSL 미세 조정 */}
      <View style={styles.hslSection}>
        <ThemedText style={styles.label}>미세 조정 (HSL)</ThemedText>

        <View style={styles.sliderContainer}>
          <ThemedText style={styles.sliderLabel}>색상 (H)</ThemedText>
          <input
            type="range"
            min="0"
            max="360"
            value={hslValues.h}
            onChange={(e) => handleHslChange('h', parseInt(e.target.value))}
            style={styles.slider}
          />
          <ThemedText style={styles.sliderValue}>{hslValues.h}°</ThemedText>
        </View>

        <View style={styles.sliderContainer}>
          <ThemedText style={styles.sliderLabel}>채도 (S)</ThemedText>
          <input
            type="range"
            min="0"
            max="100"
            value={hslValues.s}
            onChange={(e) => handleHslChange('s', parseInt(e.target.value))}
            style={styles.slider}
          />
          <ThemedText style={styles.sliderValue}>{hslValues.s}%</ThemedText>
        </View>

        <View style={styles.sliderContainer}>
          <ThemedText style={styles.sliderLabel}>명도 (L)</ThemedText>
          <input
            type="range"
            min="0"
            max="100"
            value={hslValues.l}
            onChange={(e) => handleHslChange('l', parseInt(e.target.value))}
            style={styles.slider}
          />
          <ThemedText style={styles.sliderValue}>{hslValues.l}%</ThemedText>
        </View>
      </View>

      {/* 다크모드 가독성 경고 */}
      {readability.warning && (
        <View style={[styles.warningContainer, { backgroundColor: colors.border }]}>
          <ThemedText style={styles.warningText}>{readability.warning}</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  presetColor: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPreset: {
    borderWidth: 3,
    borderColor: '#000',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  customSection: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  hexInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hexPrefix: {
    fontSize: 18,
    fontWeight: '600',
  },
  hexInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textTransform: 'uppercase',
  },
  colorPreview: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  hslSection: {
    gap: 12,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderLabel: {
    width: 60,
    fontSize: 12,
  },
  slider: {
    flex: 1,
    height: 20,
  },
  sliderValue: {
    width: 45,
    fontSize: 12,
    textAlign: 'right',
  },
  warningContainer: {
    padding: 12,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
  },
});
