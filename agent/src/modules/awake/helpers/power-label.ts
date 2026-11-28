import type { PowerSource } from '@macontrol/contracts';

const LABELS: Record<PowerSource, string> = { AC: 'Від мережі', BAT: 'Від батареї', unknown: '—' };

export function powerLabel(power: PowerSource): string {
  return LABELS[power];
}
