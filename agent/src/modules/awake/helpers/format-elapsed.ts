import { formatDuration } from './format-duration';

/** Тривалість між двома моментами: «N год M хв» або «M хв». */
export function formatElapsed(fromIso: string, toIso: string): string {
  return formatDuration(new Date(toIso).getTime() - new Date(fromIso).getTime());
}
