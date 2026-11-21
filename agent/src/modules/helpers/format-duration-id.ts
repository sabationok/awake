/** Тривалість у мілісекундах у форматі id пресетів Mac: «45m», «2h», «1h30m». */
export function formatDurationId(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h${rest}m` : `${hours}h`;
}
