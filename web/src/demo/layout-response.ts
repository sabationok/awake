import type { UiShell } from '@awake/contracts';

export type Stage = 'preview' | 'dev' | 'production';

/**
 * Що віддав `/api/ui/shell`: індекс роутів з Upstash або `shell: null` з причиною (`reason`). Сторінки — окремо,
 * `/api/ui/pages/<id>`, по одній.
 */
export interface ShellResponse {
  shell: UiShell | null;
  stage: Stage;
  reason: string | null;
  /**
   * Пульс агента з Upstash: `online` — ключ є і пульс увімкнено; `offline` — ключа немає (агент зупинився або
   * пропустив пульси); `unknown` — пульс вимкнено в Web UI на Mac.
   */
  agent?: { status: 'online' | 'offline' | 'unknown'; at: string | null };
}
