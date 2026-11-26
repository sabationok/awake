import type { SecretSource } from '@awake/contracts';
import type { ServerWebInfo } from '@awake/contracts';

/** Адреса, за якою відкривається Web UI; `url: null` — зараз недоступна, `note` каже чому. */
export interface WebUiAddress {
  id: string;
  label: string;
  symbol: string;
  url: string | null;
  note: string;
}

/** Жива вебсесія для сторінки «Вхід». */
export interface WebUiSessionRow {
  id: string;
  deviceName: string;
  /** Канал, через який сполучено пристрій сесії: `local` | `tailnet` | `remote`. */
  via: string;
  lastActiveAt: string;
  expiresAt: string;
}

/** Сполучений пристрій для сторінки «Пристрої». */
export interface WebUiDeviceRow {
  id: number;
  name: string;
  via: string;
  createdAt: string;
  lastSeenAt: string | null;
}

/** Усе, з чого будуються сторінки модуля «Web UI». Збирає WebUiMacModule, сторінки лише малюють. */
/** Remote KV Store: чи задано ключі і звідки сервер їх узяв (значення ніколи не йдуть у дерево). */
export interface WebUiRemoteStore {
  configured: boolean;
  source: SecretSource;
}

export interface WebUiSnapshot {
  addresses: WebUiAddress[];
  web: ServerWebInfo;
  passwordSet: boolean;
  sessions: WebUiSessionRow[];
  /** Звідки сервер узяв пароль Web UI; з env / Envify форма його не перебиває. */
  passwordSource: SecretSource;
  /** Ключ JWT аппки (квитки входу у Web UI через relay): задано і звідки. */
  jwtKey: { configured: boolean; source: SecretSource };
  trustedNetworks: string[];
  currentSsid: string | null;
  remoteStore: WebUiRemoteStore;
  devices: WebUiDeviceRow[];
  pendingRequests: number;
}
