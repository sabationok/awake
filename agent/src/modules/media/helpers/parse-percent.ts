/** Відсоток 0…100 з параметра дії (з вебу число, з бота рядок). null — не відсоток. */
export function parsePercent(raw: string | number | boolean | undefined): number | null {
  const value = typeof raw === 'string' ? Number(raw.replace('%', '')) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) return null;
  return Math.round(value);
}
