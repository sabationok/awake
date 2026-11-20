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
