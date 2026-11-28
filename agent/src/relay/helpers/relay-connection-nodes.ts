import type { UiNode } from '@macontrol/contracts';
import type { RelayConnectionInfo } from '../types/relay-connection.types';

/** Рядки Host про підключення: URL webhooxy цього stage і чого бракує. Значення секретів тут не показуються. */
export function relayConnectionNodes(connection: RelayConnectionInfo): UiNode[] {
  const { missing } = connection;
  return [
    { id: 'url', type: 'row', label: 'URL', value: connection.url ?? 'немає для цього stage', hint: `stage ${connection.stage}` },
    ...(missing.length ? [{ id: 'missing', type: 'row' as const, label: 'Бракує', value: String(missing.length), hint: missing.join(', ') }] : []),
  ];
}
