import type { UiCompare } from '@awake/contracts';

/** Стабільне «минуле» для фікстур: те саме число між перезавантаженнями, ±40 % від поточного. */
export function fixtureCompare(id: string, current: number, format: (n: number) => string, goodWhen?: UiCompare['goodWhen']): UiCompare {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const previous = Math.round(current * (0.6 + (Math.abs(hash) % 81) / 100));
  return {
    previous: format(previous),
    deltaPct: previous === 0 ? null : ((current - previous) / previous) * 100,
    ...(goodWhen ? { goodWhen } : {}),
  };
}
