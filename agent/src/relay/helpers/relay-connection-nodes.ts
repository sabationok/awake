import type { UiNode } from '@awake/contracts';
import type { RelayConnectionInfo } from '../types/relay-connection.types';

/**
 * Рядки Host про підключення, яких не видно у формі «Ключі» SwiftUI (там у кожного ключа своє джерело):
 * URL webhooxy цього stage і ключі, яких немає ніде. Значення ключів тут не показуються.
 */
export function relayConnectionNodes(connection: RelayConnectionInfo): UiNode[] {
  const missing = connection.keys.filter((key) => key.source === null).map((key) => key.name);
  return [
    { id: 'url', type: 'row', label: 'URL', value: connection.url ?? 'немає для цього stage', hint: `stage ${connection.stage}` },
    ...(missing.length ? [{ id: 'missing', type: 'row' as const, label: 'Бракує ключів', value: String(missing.length), hint: missing.join(', ') }] : []),
  ];
}
