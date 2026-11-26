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
export interface WebUiSnapshot {
  addresses: WebUiAddress[];
  web: ServerWebInfo;
  passwordSet: boolean;
  sessions: WebUiSessionRow[];
  trustedNetworks: string[];
  currentSsid: string | null;
  upstashConfigured: boolean;
  devices: WebUiDeviceRow[];
  pendingRequests: number;
}
