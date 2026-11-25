import type { UiOption } from '@awake/contracts';

/** Як часто перевіряти стан Mac на наближення кінця сесії і таймера сну. */
export const SESSION_ENDING_POLL_MS = 30_000;

/** Ключ налаштування «Попереджати за» в модулі telegram (вкладка «Попередження» на Сповіщеннях). */
export const SESSION_ENDING_LEAD_KEY = 'events.ending.lead';

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
