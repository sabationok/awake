import type { ModuleContext } from '../../types/mac-module';

const UNIT_SECONDS = { m: 60, h: 3600, d: 86400 } as const;

/** Секунди тривалості `30m` / `2h` / `1d`. */
export function durationSeconds(duration: string): number {
  const match = /^(\d+)([mhd])$/.exec(duration);
  return match ? Number(match[1]) * UNIT_SECONDS[match[2] as keyof typeof UNIT_SECONDS] : 0;
}

/** Хвилини до найближчого `HH:MM` (сьогодні або завтра) як тривалість для Mac, щонайменше 1m. */
export function untilDuration(clock: string, now: Date): string {
  const [h, m] = clock.split(':').map(Number);
  const end = new Date(now);
  end.setHours(h, m, 0, 0);
  if (end <= now) end.setDate(end.getDate() + 1);
  return `${Math.max(1, Math.round((end.getTime() - now.getTime()) / 60000))}m`;
}

/** Що запустить «Старт» зараз: тривалість за вкладкою «Період» або «Час». */
export function plannedDuration(ctx: ModuleContext, now: Date): string {
  return ctx.setting<string>('mode') === 'time'
    ? untilDuration(ctx.setting<string>('until'), now)
    : ctx.setting<string>('duration');
}
