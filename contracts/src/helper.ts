// Протокол сервер ↔ помічник (JSON lines через stdin/stdout помічника).
// Помічник — маленький процес на чистому Swift, єдиний, хто звертається до macOS. Його запускає сервер.
// Напрямок один: сервер просить, помічник виконує і звітує. Рішень помічник не приймає.
import type { PowerSource, ProximityReport, ThermalLevel } from './index';

/** Системна частина стану Mac: те, що помічник читає з macOS. Сесій тут немає, вони належать серверу. */
export interface HelperState {
  host: string;
  battery: number | null;
  power: PowerSource;
  thermal: ThermalLevel;
  lidClosed: boolean;
  /** Сон вимкнено через `pmset disablesleep` (ким завгодно). */
  sleepBlocked: boolean;
  /** null без дозволу геолокації (його дає власник помічнику, MaControl Helper) або без Wi-Fi. */
  ssid: string | null;
  /** Гучність виходу 0…100; null — пристрій не дає її змінювати. */
  volume: number | null;
  muted: boolean;
  /** Яскравість вбудованого дисплея 0…100; null — його немає. */
  brightness: number | null;
  /** Секунди від останнього руху миші чи натискання клавіші. */
  idleSeconds: number;
  /** Дозволи, видані в системі (правила sudoers): `sleepControl`, `thermalRead`. */
  granted: string[];
}

/** Примітиви, які помічник уміє виконати. */
export type HelperAction =
  | 'lock'
  | 'displayOff'
  | 'volume'
  | 'mute'
  | 'brightness'
  /** `pmset -a disablesleep` через sudo (правило sudoers з install.sh): true — Mac не засинає навіть із закритою кришкою. */
  | 'sleepDisabled'
  /** Присипити Mac зараз. Не діє, поки сон вимкнено. */
  | 'sleepNow'
  /** Видати або відкликати системний дозвіл `name`: помічник показує вікно пароля macOS і чекає відповіді власника. */
  | 'permissionGrant'
  | 'permissionRevoke'
  /**
   * Підтвердження власника: системне вікно Touch ID (або пароль Mac, коли Touch ID немає). `name` — чому питаємо,
   * macOS показує це у вікні. ok: false з `error: 'cancelled'` — власник відмовив. Яким діям потрібне, вирішує сервер.
   */
  | 'authenticate'
  /**
   * Сканувати Bluetooth для «Поруч»: `value` true / false, `name` — id вибраного пристрою ('' — не вибрано).
   * Поки ввімкнено, помічник раз на 2 с шле `proximity`. Перше ввімкнення показує системний запит доступу до Bluetooth.
   */
  | 'bluetoothScan';

export const HELPER_ACTIONS: readonly HelperAction[] = ['lock', 'displayOff', 'volume', 'mute', 'brightness', 'sleepDisabled', 'sleepNow', 'permissionGrant', 'permissionRevoke', 'authenticate', 'bluetoothScan'];

export interface HelperRequest {
  id: string;
  action: HelperAction;
  /** volume / brightness — 0…100, mute / sleepDisabled / bluetoothScan — boolean. */
  value?: number | boolean;
  /** permissionGrant / permissionRevoke — назва дозволу; authenticate — причина для вікна Touch ID; bluetoothScan — id пристрою. */
  name?: string;
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
  | { type: 'result'; data: HelperResult }
  /** Bluetooth-пристрої поруч, раз на 2 с, поки ввімкнено `bluetoothScan`. Рішення блокувати — за сервером. */
  | { type: 'proximity'; data: ProximityReport };
