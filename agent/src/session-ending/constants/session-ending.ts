import type { UiOption } from '@macontrol/contracts';

/** Як часто перевіряти стан Mac на наближення кінця сесії і таймера сну. */
export const SESSION_ENDING_POLL_MS = 30_000;

/** «Попереджати за» окремо для кожного виду сесії; вкладка Awake і вкладка Sleeper на Сповіщеннях. */
export const SESSION_ENDING_LEAD_KEYS = {
  awake: 'events.ending.awake.lead',
  sleep: 'events.ending.sleep.lead',
} as const;

/** Значення за замовчуванням, хвилини. */
export const SESSION_ENDING_LEAD_DEFAULT = '15';

/** Варіанти «Попереджати за»: значення — хвилини рядком, як у select. */
export const SESSION_ENDING_LEAD_OPTIONS: UiOption[] = [
  { value: '5', label: '5 хв' },
  { value: '10', label: '10 хв' },
  { value: '15', label: '15 хв' },
  { value: '30', label: '30 хв' },
  { value: '60', label: '1 год' },
];
