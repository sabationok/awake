import type { ModuleSource } from '../../modules/types/module-source';

/** action — дія модуля (`@BotAction`); screen — екран меню (`@BotScreen`); setting — зміна налаштування модуля. */
export type BotEventType = 'action' | 'screen' | 'setting';

/** Один виклик нашого бота, з якого б транспорту він не прийшов: SwiftUI, вебдашборд / relay чи Telegram. */
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
}

export type BotEventCreate = Omit<BotEventRecord, 'id' | 'at' | 'ok' | 'error'> & { ok?: boolean; error?: string | null };

/** Лічильники за день і за весь час: `total`, `src.<source>`, `type.<type>`, `ns.<namespace>`, `error`, плюс довільні від транспортів. */
export interface BotMetrics {
  today: Record<string, number>;
  total: Record<string, number>;
}
