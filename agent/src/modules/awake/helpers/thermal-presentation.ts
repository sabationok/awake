import type { ThermalLevel, UiTone } from '@macontrol/contracts';

const PRESENTATION: Record<ThermalLevel, { label: string; tone: UiTone }> = {
  nominal: { label: 'Норма', tone: 'green' },
  fair: { label: 'Тепло', tone: 'orange' },
  serious: { label: 'Гаряче', tone: 'orange' },
  critical: { label: 'Перегрів', tone: 'red' },
};

/** Текст і колір іконки для рівня температури. */
export function thermalPresentation(level: ThermalLevel): { label: string; tone: UiTone } {
  return PRESENTATION[level];
}
