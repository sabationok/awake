import type { UiOption } from '@awake/contracts';

/** Через скільки хвилин заснути. `0` — таймера немає. */
export const SLEEP_TIMER_OPTIONS: UiOption[] = [
  { value: '0', label: 'Вимкнено' },
  { value: '15', label: '15 хв' },
  { value: '30', label: '30 хв' },
  { value: '45', label: '45 хв' },
  { value: '60', label: '1 год' },
  { value: '90', label: '1,5 год' },
  { value: '120', label: '2 год' },
];

/** Найдовший таймер, який приймає дія: 12 год. */
export const SLEEP_TIMER_MAX_MINUTES = 720;
