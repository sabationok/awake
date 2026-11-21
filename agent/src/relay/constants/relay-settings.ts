import type { SettingDefinition } from '@awake/contracts';

/** Налаштування relay лише в SwiftUI (scope mac); вмикати й вимикати можна ще з Telegram (/relay). */
export const RELAY_SETTINGS: SettingDefinition[] = [
  {
    type: 'switch',
    key: 'enabled',
    label: 'Relay через webhooxy',
    hint: 'Керування з дашборду поза домашньою мережею',
    icon: { symbol: 'antenna.radiowaves.left.and.right', tone: 'accent' },
    scope: 'mac',
    page: 'relay',
    default: false,
  },
];
