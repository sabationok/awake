import type { UiNode } from '@awake/contracts';
import type { RelayConnectionInfo, RelayConnectionKey } from '../types/relay-connection.types';

const KEY_LABEL: Record<RelayConnectionKey['field'], string> = {
  workspace: 'Workspace',
  destId: 'Destination',
  room: 'Room',
  workspaceToken: 'Токен воркспейсу',
  ticketKey: 'Ключ квитків viewer-а',
};

const SOURCE_LABEL = { env: 'process.env', file: 'relay.env' } as const;

function keyNode(key: RelayConnectionKey): UiNode {
  const value = key.source === null ? 'немає' : key.secret ? 'задано' : (key.value ?? 'задано');
  const from = key.source === null ? undefined : SOURCE_LABEL[key.source];
  return { id: `key-${key.field}`, type: 'row', label: KEY_LABEL[key.field], value, hint: [key.name, from].filter(Boolean).join(' · ') };
}

/** Рядки «Підключення»: stage, URL webhooxy і кожен ключ relay; значення секретів не показуються. */
export function relayConnectionNodes(connection: RelayConnectionInfo): UiNode[] {
  return [
    { id: 'stage', type: 'row', label: 'Stage', value: connection.stage },
    { id: 'url', type: 'row', label: 'URL', value: connection.url ?? 'немає для цього stage' },
    // Порядок KEY_LABEL: спершу куди підключаємось, потім секрети.
    ...(Object.keys(KEY_LABEL) as RelayConnectionKey['field'][])
      .map((field) => connection.keys.find((key) => key.field === field))
      .filter((key): key is RelayConnectionKey => !!key)
      .map(keyNode),
  ];
}
