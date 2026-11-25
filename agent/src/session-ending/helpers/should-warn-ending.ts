/** Вхід рішення «попередити зараз?»: кінець і початок сесії (ISO), поточний час (мс) і «Попереджати за» (хв). */
export interface SessionEndingCheck {
  /** ISO, коли сесія скінчиться. */
  end: string;
  /** ISO, коли сесія почалась; null — невідомо. */
  start: string | null;
  now: number;
  leadMinutes: number;
}

/**
 * Попереджати зараз, якщо до кінця лишилось не більше `leadMinutes`, але ще не минуло. Коротші за попередження
 * сесії не попереджаємо: попередження про кінець 5-хвилинної сесії за 15 хв уже було б помилкою. Невідомий початок
 * вважаємо довгим сеансом. Некоректна дата кінця — не попереджаємо.
 */
export function shouldWarnEnding(check: SessionEndingCheck): boolean {
  const endAt = Date.parse(check.end);
  if (Number.isNaN(endAt)) return false;
  const leadMs = check.leadMinutes * 60_000;
  const leftMs = endAt - check.now;
  if (leftMs <= 0 || leftMs > leadMs) return false;
  const startAt = check.start === null ? NaN : Date.parse(check.start);
  if (Number.isNaN(startAt)) return true;
  return endAt - startAt > leadMs;
}
