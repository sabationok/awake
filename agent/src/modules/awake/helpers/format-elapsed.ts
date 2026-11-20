/** Тривалість між двома моментами: «N год M хв» або «M хв». */
export function formatElapsed(fromIso: string, toIso: string): string {
  const minutes = Math.max(0, Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} год ${minutes % 60} хв` : `${minutes} хв`;
}
