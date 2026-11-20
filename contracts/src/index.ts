// Спільні типи агента, Mac-аппки і дашборду. Лише типи і константи без залежностей.
export * from './ui';
export * from './modules';

export type PowerSource = 'AC' | 'BAT' | 'unknown';
export type ThermalLevel = 'nominal' | 'fair' | 'serious' | 'critical';
/** Звідки прийшла дія над сесією. */
export type SessionSource = 'mac' | 'telegram' | 'web';
export type SessionEventType = 'start' | 'restart' | 'stop';
export type CommandAction = 'start' | 'stop' | 'lock' | 'displayOff' | 'setting';

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
}

/** Те, що лежить в Upstash: живий стан плюс локальна адреса для довіреної мережі. */
export interface Presence {
  state: MacState;
  /** http-адреса агента в локальній мережі з токеном у фрагменті; null поза довіреною мережею. */
  localUrl: string | null;
  updatedAt: string;
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

export interface LogRecord {
  id: number;
  at: string;
  text: string;
}

export interface CommandRequest {
  action: CommandAction;
  /** Для start: 30m, 1h, 2h… Без нього Mac бере тривалість за замовчуванням. */
  duration?: string;
  /** Для setting: ключ `<module>.<key>` і нове значення, яке Mac має застосувати в себе. */
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
    };

export type AgentToMacMessage =
  | { type: 'ready'; data: { port: number } }
  | { type: 'command'; data: CommandRequest & { id: string; source: SessionSource } };

/** Ключ стану в Upstash. TTL короткий: застарілий ключ означає, що Mac офлайн. */
export const PRESENCE_KEY = 'awake:presence';
export const PRESENCE_TTL_SECONDS = 45;

/** Дерево UI для дашборду на Vercel (лише вузли зі scope all). */
export const UI_TREE_KEY = 'maccc:ui';
/** Черга подій UI з Vercel/WebApp до Mac. Nest читає її, поки хтось дивиться дашборд. */
export const UI_EVENTS_KEY = 'maccc:events';
/** Ключ «дашборд відкритий»: Vercel оновлює його, Nest тоді частіше читає чергу. */
export const UI_WATCH_KEY = 'maccc:watch';
