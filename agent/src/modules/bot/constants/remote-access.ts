import type { SettingDefinition } from '@awake/contracts';

/** Через що дашборд дістається до агента поза домашньою Wi-Fi. Вибір — на Огляді Агента, самі шляхи — модулі tailscale і relay. */
export type RemoteAccess = 'off' | 'tailscale' | 'webhooxy';

export const REMOTE_ACCESS_MODULE = 'bot';
export const REMOTE_ACCESS_KEY = 'remote';

/** Шлях працює, лише коли його вибрано тут і його модуль увімкнено; вимкнений модуль — сіра опція. */
export const REMOTE_ACCESS_SETTING: SettingDefinition = {
  type: 'select',
  key: REMOTE_ACCESS_KEY,
  label: 'Віддалений доступ',
  hint: 'Через що працює дашборд поза домашньою Wi-Fi',
  icon: { symbol: 'globe', tone: 'accent' },
  scope: 'mac',
  page: 'bot-overview',
  default: 'off',
  options: [
    { value: 'off', label: 'Вимкнено' },
    { value: 'tailscale', label: 'Tailscale' },
    { value: 'webhooxy', label: 'Webhooxy' },
  ],
};
