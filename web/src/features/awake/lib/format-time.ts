/** «1:24:05» до кінця або null, якщо час минув. */
export function formatRemaining(until: string | null, now: number): string | null {
  if (!until) return null;
  const seconds = Math.floor((new Date(until).getTime() - now) / 1000);
  if (seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** «2 год 15 хв» між двома моментами. */
export function formatSpan(from: string, to: string | null, now: number): string {
  const minutes = Math.max(0, Math.round(((to ? new Date(to).getTime() : now) - new Date(from).getTime()) / 60000));
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h} год ${minutes % 60} хв` : `${minutes} хв`;
}

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });
const dateTimeFormat = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const formatClock = (iso: string) => timeFormat.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));

/** «щойно», «2 хв тому». */
export function formatAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 10) return 'щойно';
  if (seconds < 60) return `${seconds} с тому`;
  return `${Math.round(seconds / 60)} хв тому`;
}
