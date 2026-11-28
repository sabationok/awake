import type { SessionSource } from '@macontrol/contracts';

const LABELS: Record<SessionSource, string> = { mac: 'Mac', telegram: 'Telegram', web: 'Web UI' };

export function sessionSourceLabel(source: SessionSource): string {
  return LABELS[source];
}
