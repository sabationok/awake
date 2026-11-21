/** Хвилини до найближчого `HH:MM` (сьогодні або завтра), щонайменше 1. */
export function minutesUntil(clock: string, now: Date): number {
  const [h, m] = clock.split(':').map(Number);
  const end = new Date(now);
  end.setHours(h, m, 0, 0);
  if (end <= now) end.setDate(end.getDate() + 1);
  return Math.max(1, Math.round((end.getTime() - now.getTime()) / 60000));
}
