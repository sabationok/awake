import type { UiNode } from '@awake/contracts';
import type { RelayConnectionInfo } from '../types/relay-connection.types';

/**
 * Рядки Host про підключення, яких не видно у формі «Ключі» SwiftUI: URL webhooxy цього stage, ключі, що
 * перебиває process.env (Envify), і ключі, яких немає ніде. Значення ключів тут не показуються.
 */
export function relayConnectionNodes(connection: RelayConnectionInfo): UiNode[] {
  const fromEnv = connection.keys.filter((key) => key.source === 'env').map((key) => key.name);
  const missing = connection.keys.filter((key) => key.source === null).map((key) => key.name);
  return [
    { id: 'url', type: 'row', label: 'URL', value: connection.url ?? 'немає для цього stage', hint: `stage ${connection.stage}` },
    ...(fromEnv.length ? [{ id: 'from-env', type: 'row' as const, label: 'З Envify', value: String(fromEnv.length), hint: fromEnv.join(', ') }] : []),
    ...(missing.length ? [{ id: 'missing', type: 'row' as const, label: 'Бракує ключів', value: String(missing.length), hint: missing.join(', ') }] : []),
  ];
}
