const START_ANGLE = -90;

export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function minutesToAngle(totalMinutes: number): number {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  return START_ANGLE + (normalized / 1440) * 360;
}

export function timeToAngle(time: string): number {
  return minutesToAngle(timeToMinutes(time));
}

export function getPointOnCircle(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}
