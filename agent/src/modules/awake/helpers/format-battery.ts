export function formatBattery(level: number | null): string {
  return level === null ? '—' : `${level}%`;
}
