import type { LiveMessage, UiEvent, UiPageLayout, UiShell } from '@macontrol/contracts';
import { callAgent, callAgentTagged, streamAgent, type AgentError, type Tagged } from './pairing/agent-api';

/**
 * Звідки Web UI бере індекс роутів і сторінки і куди шле події. `tag` — ETag попередньої відповіді: `null` у
 * відповідь — версія та сама (`304`). Сторінки `undefined` — її немає (`404`).
 */
export interface UiSource {
  shell(tag: string | null): Promise<Tagged<UiShell | null> | null>;
  page(pageId: string, tag: string | null): Promise<Tagged<UiPageLayout> | null | undefined>;
  send?(event: UiEvent): Promise<void>;
  /**
   * Живий канал стейту й тостів: повідомлення в `onMessage`, поки не обірветься або не скасують `signal`.
   * `onMessage` повертає `false` на пропуск `rev` — тоді канал закривається, і наступне підключення дає повний стейт.
   */
  live?(onMessage: (message: LiveMessage) => boolean, signal: AbortSignal): Promise<void>;
}

/** NDJSON з тіла відповіді: рядок за рядком, порожні (keepalive) пропускаються. */
export async function readLines(res: Response, onLine: (line: string) => boolean): Promise<void> {
  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line && !onLine(line)) {
        await reader.cancel();
        return;
      }
      newline = buffer.indexOf('\n');
    }
  }
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
    /** `GET /api/ui/live`: першим рядком `state.full`, далі патчі й тости. */
    async live(onMessage, signal) {
      const res = await streamAgent('/api/ui/live', token, signal);
      await readLines(res, (line) => onMessage(JSON.parse(line) as LiveMessage));
    },
  };
}
