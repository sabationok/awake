/** Вхідне від власника чату (команда, кнопка) чи вихідне від бота (сповіщення). */
export type BotMessageDirection = 'in' | 'out';

/** command — /sleep, /start; button — натиснута кнопка меню; notify — сповіщення про подію. */
export type BotMessageType = 'command' | 'button' | 'notify';

export interface BotMessageRecord {
  id: number;
  at: string;
  direction: BotMessageDirection;
  type: BotMessageType;
  /** Namespace бота (`sleep`); null для /start, /help і сповіщень. */
  namespace: string | null;
  text: string;
  ok: boolean;
  error: string | null;
}

export type BotMessageCreate = Omit<BotMessageRecord, 'id' | 'at' | 'ok' | 'error'> & { ok?: boolean; error?: string | null };

/** Лічильники за день і за весь час: `in.command`, `in.button`, `out.notify`, `error`, `denied`, `ns.<namespace>`. */
export interface BotMetrics {
  today: Record<string, number>;
  total: Record<string, number>;
}

/** Стан polling-у Telegram, як його бачить сервіс бота. */
export interface BotRunState {
  running: boolean;
  since: string | null;
}
