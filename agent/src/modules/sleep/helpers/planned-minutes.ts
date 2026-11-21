import { minutesUntil } from '../../helpers/minutes-until';
import type { ModuleContext } from '../../types/mac-module';

/** Що запустить «Старт» зараз: хвилини за вкладкою «Період» або до часу з вкладки «Час». */
export function plannedMinutes(ctx: ModuleContext, now: Date): number {
  return ctx.setting<string>('mode') === 'time'
    ? minutesUntil(ctx.setting<string>('until'), now)
    : Number(ctx.setting<string>('minutes'));
}
