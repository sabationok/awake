import type { UiTree } from '@awake/contracts';
import { callAgent } from '@/features/pairing/agent-api';
import type { UiSource } from './ui-source';

/** Пульт на Mac: дерево і події йдуть до API агента з токеном пристрою. */
export function localSource(token: string): UiSource {
  return {
    async load() {
      return (await callAgent<UiTree | null>('/api/ui?scope=local', token)) ?? null;
    },
    async send(event) {
      await callAgent<unknown>('/api/ui/events', token, { method: 'POST', body: JSON.stringify(event) });
    },
  };
}
