// Протокол сервер ↔ помічник (JSON lines через stdin/stdout помічника).
// Помічник — маленький процес на чистому Swift, єдиний, хто звертається до macOS. Його запускає сервер.
// Напрямок один: сервер просить, помічник виконує і звітує. Рішень помічник не приймає.
import type { PowerSource, ThermalLevel } from './index';

/** Системна частина стану Mac: те, що помічник читає з macOS. Сесій тут немає, вони належать серверу. */
export interface HelperState {
  host: string;
  battery: number | null;
  power: PowerSource;
  thermal: ThermalLevel;
  lidClosed: boolean;
  /** Сон вимкнено через `pmset disablesleep` (ким завгодно). */
  sleepBlocked: boolean;
  /** null без дозволу геолокації або без Wi-Fi. */
  ssid: string | null;
  /** Гучність виходу 0…100; null — пристрій не дає її змінювати. */
  volume: number | null;
  muted: boolean;
  /** Яскравість вбудованого дисплея 0…100; null — його немає. */
  brightness: number | null;
}

/** Примітиви, які помічник уміє виконати. */
export type HelperAction = 'lock' | 'displayOff' | 'volume' | 'mute' | 'brightness';

export const HELPER_ACTIONS: readonly HelperAction[] = ['lock', 'displayOff', 'volume', 'mute', 'brightness'];

export interface HelperRequest {
  id: string;
  action: HelperAction;
  /** volume / brightness — 0…100, mute — boolean. */
  value?: number | boolean;
}

export interface HelperResult {
  id: string;
  ok: boolean;
  error?: string;
}

export type ServerToHelperMessage = { type: 'request'; data: HelperRequest };

export type HelperToServerMessage =
  /** Перший рядок після старту. */
  | { type: 'hello'; data: { version: string; pid: number } }
  /** Раз на кілька секунд і одразу після кожної виконаної дії. */
  | { type: 'state'; data: HelperState }
  | { type: 'result'; data: HelperResult };
