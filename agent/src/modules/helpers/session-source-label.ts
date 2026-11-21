import type { SessionSource } from '@awake/contracts';

const LABELS: Record<SessionSource, string> = { mac: 'Mac', telegram: 'Telegram', web: 'Пульт' };

export function sessionSourceLabel(source: SessionSource): string {
  return LABELS[source];
}
