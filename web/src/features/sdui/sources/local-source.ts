import type { UiTree } from '@awake/contracts';
import { callAgent } from '@/features/pairing/agent-api';
import type { UiSource } from './ui-source';

/** Пульт на Mac: дерево і події йдуть до API агента. LAN — з токеном пристрою, Tailscale — null (кукі). */
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
