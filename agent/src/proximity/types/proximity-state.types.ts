import type { BluetoothState, NearbyDevice } from '@awake/contracts';

export type ProximityWhen = 'session' | 'always';

export interface ProximityConfig {
  enabled: boolean;
  /** Id CoreBluetooth вибраного пристрою; '' — не вибрано. */
  device: string;
  /** Поріг сигналу, dBm. */
  range: number;
  delayMs: number;
  when: ProximityWhen;
}

/** Що бачить агент зараз: для сторінки «Поруч» і рішення блокувати. */
export interface ProximityState {
  config: ProximityConfig;
  /** null — помічник ще не надіслав звіт або давно мовчить. */
  bluetooth: BluetoothState | null;
  devices: NearbyDevice[];
  /** Вибраний пристрій у звіті; null — не видно. */
  target: NearbyDevice | null;
  /** Остання відома назва вибраного пристрою. */
  targetName: string | null;
  /** Стежимо зараз (увімкнено, вибрано пристрій, сесія за потреби, свіжий звіт). */
  watching: boolean;
  /** ISO, з якого моменту пристрій «далеко»; null — поруч. */
  farSince: string | null;
  lastLockAt: string | null;
}
