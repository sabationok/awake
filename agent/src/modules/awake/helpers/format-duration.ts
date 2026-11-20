/** Тривалість у мілісекундах: «N год M хв» або «M хв». */
export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} год ${minutes % 60} хв` : `${minutes} хв`;
}
