import type { MacState, UiRow } from '@awake/contracts';
import { SLEEP_TIMER_OPTIONS } from '../constants/sleep-timer-options';
import { formatClock } from './format-clock';

/**
 * «Заснути через»: вибір запускає таймер на Mac. Mac сам рахує і присипляє, навіть коли йде кіно,
 * тож агент лише показує `sleepAt`. Поки таймер іде, у списку вибрано «Вимкнено» не буде:
 * вибір будь-чого перезапускає його з нуля, «Вимкнено» скасовує.
 */
export function sleepTimerRow(mac: MacState | null): UiRow {
  const sleepAt = mac?.sleepAt ?? null;
  const options = sleepAt ? [{ value: 'running', label: `До ${formatClock(sleepAt)}` }, ...SLEEP_TIMER_OPTIONS] : SLEEP_TIMER_OPTIONS;
  return {
    id: 'sleep-timer',
    type: 'row',
    label: 'Заснути через',
    icon: { symbol: 'moon.zzz.fill', tone: 'indigo' },
    hint: sleepAt ? 'Mac засне, навіть якщо грає відео' : 'Mac засне за таймером, навіть якщо грає відео',
    dot: sleepAt ? { tone: 'indigo', pulse: true } : undefined,
    countdownTo: sleepAt,
    control: {
      type: 'select',
      value: sleepAt ? 'running' : '0',
      options,
      disabled: mac === null,
      action: { module: 'awake', name: 'sleepTimer' },
    },
  };
}
