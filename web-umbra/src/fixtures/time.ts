// Відносний час для fixtures: значення рахуються при завантаженні сторінки, щоб відліки йшли «наживо».

/** ISO-час через `minutes` хвилин від зараз (мінус — у минулому). */
export function inMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/** ISO-час початку бакета: `n` одиниць тому, вирівняно до години / дня. */
export function bucketsAgo(n: number, unit: 'minute' | 'hour' | 'day'): string {
  const d = new Date();
  if (unit === 'minute') d.setSeconds(0, 0), d.setMinutes(d.getMinutes() - n);
  if (unit === 'hour') d.setMinutes(0, 0, 0), d.setHours(d.getHours() - n);
  if (unit === 'day') d.setHours(0, 0, 0, 0), d.setDate(d.getDate() - n);
  return d.toISOString();
}
