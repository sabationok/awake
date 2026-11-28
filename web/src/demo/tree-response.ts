import type { UiTree } from '@awake/contracts';

/** Звідки Vercel-збірка взяла дерево. */
export type TreeOrigin = 'upstash' | 'web-swift';

export type Stage = 'preview' | 'dev' | 'production';

/** Що віддав `/api/tree` і чому саме це: `misses` — джерела, які спробували перед ним, з причиною. `tree: null` — жодне не дало. */
export interface TreeResponse {
  tree: UiTree | null;
  origin: TreeOrigin | null;
  stage: Stage;
  misses: { origin: TreeOrigin; reason: string }[];
  /**
   * Пульс агента з Upstash (лише origin upstash): `online` — ключ є і пульс увімкнено; `offline` — ключа немає
   * (агент зупинився або пропустив пульси); `unknown` — пульс вимкнено в Web UI на Mac.
   */
  agent?: { status: 'online' | 'offline' | 'unknown'; at: string | null };
}
