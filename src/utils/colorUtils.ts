// 컬러 유틸리티 함수들

// 컬러가 밝은지 확인하는 함수
export const isColorLight = (hexColor: string): boolean => {
  // hex 컬러에서 RGB 값 추출
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // 밝기 계산 (YIQ 공식)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128;
};

// 배경 컬러에 따라 적절한 텍스트 컬러 반환
export const getContrastTextColor = (hexColor: string): string => {
  return isColorLight(hexColor) ? '#000000' : '#FFFFFF';
};
