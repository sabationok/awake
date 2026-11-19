import type { PowerSource, SessionSource, ThermalLevel } from '@awake/contracts';
import type { SymbolTone } from '@/components/symbol-icon';

export const THERMAL_LABEL: Record<ThermalLevel, { label: string; tone: SymbolTone }> = {
  nominal: { label: 'Норма', tone: 'green' },
  fair: { label: 'Тепло', tone: 'orange' },
  serious: { label: 'Гаряче', tone: 'orange' },
  critical: { label: 'Перегрів', tone: 'red' },
};

export const POWER_LABEL: Record<PowerSource, string> = {
  AC: 'Від мережі',
  BAT: 'Від батареї',
  unknown: '—',
};

export const SOURCE_LABEL: Record<SessionSource, string> = {
  mac: 'Mac',
  telegram: 'Telegram',
  web: 'Пульт',
};

/** Тривалості для кнопок старту, як у Telegram-бота. */
export const START_PRESETS = [
  { duration: '1h', label: '1 год' },
  { duration: '2h', label: '2 год' },
  { duration: '4h', label: '4 год' },
] as const;
