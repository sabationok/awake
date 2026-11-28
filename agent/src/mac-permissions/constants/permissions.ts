import type { MacPermission, PrivacyAccessKind, UiIcon } from '@macontrol/contracts';

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

/** Дозволи macOS помічника (MaControl Helper): назва й пояснення для секції «Приватність macOS». */
export const PRIVACY_ACCESS_INFO: Record<PrivacyAccessKind, PermissionInfo> = {
  location: {
    title: 'Wi-Fi (геолокація)',
    icon: { symbol: 'wifi', tone: 'accent' },
    purpose: 'Назва мережі Wi-Fi для довірених мереж. macOS дає її лише з дозволом геолокації; координати не зберігаються.',
  },
  bluetooth: {
    title: 'Bluetooth',
    icon: { symbol: 'dot.radiowaves.left.and.right', tone: 'accent' },
    purpose: 'Сигнал iPhone чи Apple Watch для модуля «Поруч».',
  },
};

export function isPrivacyAccessKind(value: unknown): value is PrivacyAccessKind {
  return typeof value === 'string' && value in PRIVACY_ACCESS_INFO;
}
