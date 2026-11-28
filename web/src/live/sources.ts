import type { UiEvent, UiPageLayout, UiShell } from '@macontrol/contracts';
import { callAgent, callAgentTagged, type AgentError, type Tagged } from './pairing/agent-api';

/**
 * Звідки Web UI бере індекс роутів і сторінки і куди шле події. `tag` — ETag попередньої відповіді: `null` у
 * відповідь — версія та сама (`304`). Сторінки `undefined` — її немає (`404`).
 */
export interface UiSource {
  shell(tag: string | null): Promise<Tagged<UiShell | null> | null>;
  page(pageId: string, tag: string | null): Promise<Tagged<UiPageLayout> | null | undefined>;
  send?(event: UiEvent): Promise<void>;
}

/**
 * Web UI на Mac: `GET /api/ui/shell`, `GET /api/ui/pages/:pageId` і `POST /api/ui/events`. LAN — з токеном
 * пристрою (Bearer), Tailscale — null: браузер сам шле HttpOnly-кукі `mc_*`.
 */
export function localSource(token: string | null): UiSource {
  return {
    shell: (tag) => callAgentTagged<UiShell>('/api/ui/shell', token, tag),
    async page(pageId, tag) {
      try {
        return await callAgentTagged<UiPageLayout>(`/api/ui/pages/${encodeURIComponent(pageId)}`, token, tag);
      } catch (error) {
        if ((error as AgentError).status === 404) return undefined;
        throw error;
      }
    },
    async send(event) {
      await callAgent<unknown>('/api/ui/events', token, { method: 'POST', body: JSON.stringify(event) });
    },
  };
}
