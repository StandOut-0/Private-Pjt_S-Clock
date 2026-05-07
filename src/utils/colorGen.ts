// HSL 기반 랜덤 색상 생성 유틸리티
// 채도/명도 범위 고정으로 튀지 않는 색상 생성

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

// HSL을 Hex로 변환
export function hslToHex({ h, s, l }: HSLColor): string {
  const sPercent = s / 100;
  const lPercent = l / 100;

  const c = (1 - Math.abs(2 * lPercent - 1)) * sPercent;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lPercent - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Hex를 RGB로 변환 (getContrastTextColor용)
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

// Hex를 HSL로 변환
export function hexToHsl(hex: string): HSLColor {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// 랜덤 색상 생성 (채도 50-75%, 명도 45-65%로 튀지 않게)
export function generateRandomColor(): string {
  const h = Math.floor(Math.random() * 360);
  const s = 50 + Math.floor(Math.random() * 25); // 50-75%
  const l = 45 + Math.floor(Math.random() * 20); // 45-65%
  return hslToHex({ h, s, l });
}

// 프리셋 팔레트 (12색)
export const PRESET_COLORS = [
  '#FF6B6B', // 빨강
  '#FF9F43', // 주황
  '#F7DC6F', // 노랑
  '#96CEB4', // 초록
  '#4ECDC4', // 민트
  '#45B7D1', // 하늘
  '#5DADE2', // 파랑
  '#DDA0DD', // 보라
  '#F8C3CD', // 핑크
  '#AED6F1', // 연파랑
  '#D5DBDB', // 회색
  '#F4D03F', // 골드
];

// 색상이 다크모드에서 가독성이 좋은지 체크
export function checkDarkModeReadability(hex: string): {
  isReadable: boolean;
  warning: string | null;
} {
  const { l } = hexToHsl(hex);

  if (l > 85) {
    return { isReadable: false, warning: '너무 밝은 색상 (다크모드에서 흐릿함)' };
  }
  if (l < 25) {
    return { isReadable: false, warning: '너무 어두운 색상 (다크모드에서 구분 어려움)' };
  }
  if (l > 70) {
    return { isReadable: true, warning: '밝은 색상 (다크모드에서 주의)' };
  }
  if (l < 35) {
    return { isReadable: true, warning: '어두운 색상 (다크모드에서 주의)' };
  }

  return { isReadable: true, warning: null };
}

// 배경색에 따른 대비 텍스트 색상 (흰색/검정)
export function getContrastTextColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  // WCAG 명도 계산: 0.299*R + 0.587*G + 0.114*B
  // hexToRgb가 이미 0-1 범위로 정규화되어 있으므로 그대로 사용
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
