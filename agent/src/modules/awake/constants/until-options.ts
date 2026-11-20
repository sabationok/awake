import type { UiOption } from '@awake/contracts';

/** «Не спати до»: кожні пів години доби. */
export const UNTIL_OPTIONS: UiOption[] = Array.from({ length: 48 }, (_, i) => {
  const value = `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
  return { value, label: value };
});
