// Вебхуки webhooxy, якими користується агент. Webhooxy реєструє вебхук сам на першому вхідному запиті,
// тож агент лише пам'ятає свої (SQLite) і створює запис, коли вебхук справді з'явився. Секретів тут немає.

/** Хто надсилає в цей вебхук. */
export type WebhookProvider = 'macontrol' | 'envify';

/**
 * Для чого вебхук. `relay` — WS-кімната дашборду з Mac; `envify` — події Envify про зміну змінних;
 * `links` — разові посилання для фронтенду (сполучення тощо), що саме — каже `code` у payload.
 */
export type WebhookType = 'relay' | 'envify' | 'links';

/** Режим webhooxy (`mt_mode`). */
export type WebhookMode = 'stream' | 'oneshot';

/** Те, що є лише в деяких типів. */
export interface WebhookConfig {
  /** Кімната WS-транспорту DEST-а (`relay`). */
  room?: string;
}

export interface Webhook {
  id: number;
  /** `mt_id` у webhooxy. */
  whId: string;
  provider: WebhookProvider;
  type: WebhookType;
  mode: WebhookMode;
  /** Slug воркспейсу (`mt_wspc`). */
  workspace: string;
  /** DEST (`mt_dest`). */
  destId: string;
  config: WebhookConfig;
  createdAt: string;
  updatedAt?: string;
  disabledAt?: string;
}

/**
 * Вебхук для аппки: разом зі станом підключення (лише `relay`) і графіками подій за період, який аппка вибрала
 * (`{ action: 'period' }`). Вебхук без жодної події — без графіків.
 */
export interface WebhookInfo extends Webhook {
  status: 'online' | 'connecting' | 'offline' | 'off' | 'unconfigured' | null;
  charts: import('./ui').UiChart[];
}

/** Форма вебхука з модалки аппки. Без `id` — новий; `whId` без значення агент згенерує сам. */
export interface WebhookInput {
  id?: number;
  whId?: string;
  provider: WebhookProvider;
  type: WebhookType;
  mode: WebhookMode;
  workspace: string;
  destId: string;
  config: WebhookConfig;
}

export type WebhookAction =
  | { action: 'save'; webhook: WebhookInput }
  | { action: 'enable' | 'disable' | 'delete'; id: number }
  /** Період графіків карток: агент шле новий знімок з графіками цього періоду. */
  | { action: 'period'; period: import('./index').StatsPeriod };
