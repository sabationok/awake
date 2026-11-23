import type { ModuleSource } from '../../modules/types/module-source';

/** action — дія модуля (`@BotAction`); screen — екран меню (`@BotScreen`); setting — зміна налаштування модуля. */
export type BotEventType = 'action' | 'screen' | 'setting';

/** Один виклик нашого бота, з якого б транспорту він не прийшов: SwiftUI, Web UI / relay чи Telegram. */
export interface BotEventRecord {
  id: number;
  at: string;
  source: ModuleSource;
  type: BotEventType;
  /** Модуль бота (namespace `@Bot`), напр. `sleep`. */
  namespace: string;
  /** Дія чи екран (`start`, `'' ` — головний), для setting — `<key> = <value>`. */
  name: string;
  ok: boolean;
  error: string | null;
  /** Проксі, через який прийшов виклик (`webhooxy`), або null — напряму. */
  proxy: string | null;
}

export type BotEventCreate = Omit<BotEventRecord, 'id' | 'at' | 'ok' | 'error' | 'proxy'> & {
  ok?: boolean;
  error?: string | null;
  proxy?: string | null;
};

/** Лічильники за UTC-день і за весь час: `total`, `src.<source>`, `proxy.<id>`, `type.<type>`, `ns.<namespace>`, `error`, плюс історія bot_metrics. */
export interface BotMetrics {
  today: Record<string, number>;
  total: Record<string, number>;
}
