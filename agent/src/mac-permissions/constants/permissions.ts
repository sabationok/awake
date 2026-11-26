import type { MacPermission, UiIcon } from '@awake/contracts';

export const PERMISSIONS_MODULE = 'permissions';

export interface PermissionInfo {
  title: string;
  icon: UiIcon;
  purpose: string;
}

/** Системні дозволи Mac: назва й пояснення для сторінки «Дозволи». Кожен — окреме правило sudoers. */
export const PERMISSION_INFO: Record<MacPermission, PermissionInfo> = {
  sleepControl: {
    title: 'Керування сном',
    icon: { symbol: 'moon.zzz.fill', tone: 'accent' },
    purpose: 'Блокує сон на час сесії і повертає його після таймера, заряду чи перегріву.',
  },
  thermalRead: {
    title: 'Читання температури',
    icon: { symbol: 'thermometer.medium', tone: 'accent' },
    purpose: 'Дає статус тиску системи і сигнали про нагрівання.',
  },
};

export const MAC_PERMISSIONS = Object.keys(PERMISSION_INFO) as MacPermission[];

export function isMacPermission(value: unknown): value is MacPermission {
  return typeof value === 'string' && value in PERMISSION_INFO;
}
