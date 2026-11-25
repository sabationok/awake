import type { MacState } from '@awake/contracts';
import type { Keeper } from '../types/keeper.types';

/** Хто зараз не дає Mac заснути самому: наші сесії і сторонні процеси, без повторів. Порожньо — ніхто. */
export function keepersSummary(mac: MacState | null, keepers: Keeper[]): string[] {
  const names = new Set<string>();
  if (mac?.active) names.add('Awake');
  for (const keeper of keepers) names.add(keeper.process);
  return [...names];
}
