// Спільні типи агента, Mac-аппки і дашборду. Лише типи і константи без залежностей.
export * from './ui';
export * from './modules';
export * from './relay';

export type PowerSource = 'AC' | 'BAT' | 'unknown';
export type ThermalLevel = 'nominal' | 'fair' | 'serious' | 'critical';
/** Звідки прийшла дія над сесією. */
export type SessionSource = 'mac' | 'telegram' | 'web';
export type SessionEventType = 'start' | 'restart' | 'stop';
export type CommandAction = 'start' | 'stop' | 'lock' | 'displayOff' | 'setting' | 'sleepTimer' | 'volume' | 'mute' | 'brightness';

/** Знімок стану Mac, який Mac-аппка шле агенту. */
export interface MacState {
  host: string;
  active: boolean;
  /** ISO, кінець сесії. */
  until: string | null;
  startedAt: string | null;
  duration: string | null;
  battery: number | null;
  power: PowerSource;
  thermal: ThermalLevel;
  lidClosed: boolean;
  sleepBlocked: boolean;
  /** Поточна мережа Wi-Fi, null без дозволу геолокації або без Wi-Fi. */
  ssid: string | null;
  /** Мережа в списку довірених на Mac: лише тоді агент публікує локальну адресу. */
  trusted: boolean;
  appVersion: string;
  /** ISO, коли поставили таймер сну; null — таймера немає. */
  sleepStartedAt: string | null;
  /** ISO, коли таймер сну присипить Mac; null — таймера немає. */
  sleepAt: string | null;
  /** Гучність виходу 0…100; null — пристрій не дає її змінювати. */
  volume: number | null;
  muted: boolean;
  /** Яскравість вбудованого дисплея 0…100; null — його немає (кришка закрита, лише зовнішній монітор). */
  brightness: number | null;
}


export interface SessionRecord {
  id: number;
  startedAt: string;
  endedAt: string | null;
  duration: string | null;
  source: SessionSource;
  endReason: string | null;
  batteryStart: number | null;
  batteryEnd: number | null;
}

/** Сесія таймера сну: поставили → Mac заснув, скасували або замінили сесією Awake. */
export interface SleepTimerRecord {
  id: number;
  startedAt: string;
  sleepAt: string;
  minutes: number;
  endedAt: string | null;
  source: SessionSource;
  endReason: string | null;
}

/** Подія таймера сну від Mac-аппки. `silent` — записати в історію, але не слати в Telegram (перезапуск). */
export interface SleepTimerEvent {
  event: 'start' | 'stop';
  at: string;
  startedAt: string;
  sleepAt: string;
  minutes: number;
  source: SessionSource;
  reason?: string | null;
  silent: boolean;
}

export interface LogRecord {
  id: number;
  at: string;
  text: string;
}

export interface CommandRequest {
  action: CommandAction;
  /** Для start: 30m, 1h, 2h… Без нього Mac бере тривалість за замовчуванням. */
  duration?: string;
  /**
   * Для setting: ключ `<module>.<key>` і нове значення, яке Mac має застосувати в себе.
   * Для sleepTimer — хвилини до сну (0 скасовує), volume / brightness — 0…100, mute — boolean.
   */
  key?: string;
  value?: string | number | boolean;
}

/** Відповідь API агента. */
export interface AppResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/** Рядки протоколу Mac-аппка ↔ агент (JSON lines через stdin/stdout). */
export type MacToAgentMessage =
  | { type: 'state'; data: MacState }
  | { type: 'log'; data: { at: string; text: string } }
  | {
      type: 'session';
      data: {
        event: SessionEventType;
        at: string;
        source: SessionSource;
        duration?: string;
        battery?: number | null;
        reason?: string;
      };
    }
  | { type: 'sleepTimer'; data: SleepTimerEvent }
  /** Натискання в SwiftUI-рендерері: агент виконує його так само, як з вебу. */
  | { type: 'event'; data: import('./ui').UiEvent }
  /** Сторінка «Пристрої» в Mac-аппці: попросити свіжий знімок або відкликати пристрій. */
  | {
      type: 'devices';
      data:
        | { action: 'refresh' }
        | { action: 'revoke'; id: number }
        /** Відповідь на «Це ви?» для пристрою, що відкрив посилання з QR. */
        | { action: 'answer'; requestId: string; approve: boolean };
    };

export type AgentToMacMessage =
  | { type: 'ready'; data: { port: number } }
  | { type: 'command'; data: CommandRequest & { id: string; source: SessionSource } }
  /** Повне дерево UI (scope local) для SwiftUI; шлеться при кожній зміні. */
  | { type: 'tree'; data: import('./ui').UiTree }
  /** Усі налаштування модулів `<module>.<key>` → значення: Mac застосовує їх у себе. */
  | { type: 'settings'; data: Record<string, import('./modules').SettingValue> }
  /** Сполучені пристрої і поточне посилання сполучення: лише для Mac-аппки, у веб не йде. */
  | { type: 'devices'; data: DevicesSnapshot };

/** Сполучений браузер: токен лежить лише в ньому, тут опис і коли його бачили. */
export interface DeviceInfo {
  id: number;
  /** Коротко з User-Agent: «Chrome · macOS». */
  name: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string | null;
}

/** Посилання для сполучення нового пристрою або чому його зараз немає. */
export type DevicePairing =
  | { url: string; expiresAt: string }
  | { url: null; reason: 'untrusted' | 'noNetwork' };

/** Пристрій відкрив посилання з QR і чекає, поки на Mac підтвердять, що це ти. */
export interface DevicePairingRequest {
  id: string;
  name: string;
  userAgent: string | null;
  createdAt: string;
  /** Після цього запит без відповіді протухає. */
  expiresAt: string;
}

export interface DevicesSnapshot {
  devices: DeviceInfo[];
  requests: DevicePairingRequest[];
  pairing: DevicePairing;
}

/** Відповідь агента пристрою, що чекає підтвердження. Токен приходить лише раз, разом з approved. */
export interface DevicePairingPoll {
  status: 'pending' | 'approved' | 'denied' | 'expired';
  token?: string;
}


/**
 * Префікс усіх ключів MaControl у Redis. База Upstash спільна з іншими проєктами (envify),
 * тож ключ без префікса не пишемо: новий ключ — лише як `${REDIS_KEY_PREFIX}<name>`.
 */
export const REDIS_KEY_PREFIX = 'macontrol:';

/** Дерево UI для дашборду на Vercel (лише вузли зі scope all). Vercel лише читає його: керування йде на самому агенті. */
export const UI_TREE_KEY = `${REDIS_KEY_PREFIX}ui`;
