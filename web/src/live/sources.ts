import type { UiEvent, UiTree } from '@awake/contracts';
import { callAgent } from './pairing/agent-api';

/** Звідки локальний Web UI бере дерево і куди шле події: API агента на тому ж origin. */
export interface UiSource {
  load(): Promise<UiTree | null>;
  send(event: UiEvent): Promise<void>;
}

/**
 * Web UI на Mac: `GET /api/ui?scope=local` і `POST /api/ui/events`, як у web. LAN — з токеном пристрою (Bearer),
 * Tailscale — null: браузер сам шле HttpOnly-кукі `mc_*`.
 */
export function localSource(token: string | null): UiSource {
  return {
    async load() {
      return (await callAgent<UiTree | null>('/api/ui?scope=local', token)) ?? null;
    },
    async send(event) {
      await callAgent<unknown>('/api/ui/events', token, { method: 'POST', body: JSON.stringify(event) });
    },
  };
}
