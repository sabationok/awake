import type { SettingDefinition } from '@awake/contracts';

export const TAILSCALE_MODULE = 'tailscale';
/** Головна вкладка модуля: тут його перемикач. */
export const TAILSCALE_PAGE = 'tailscale';
/** Id проксі на сторінці Агента і в журналі бота. */
export const TAILSCALE_PROXY_ID = 'http:tailscale';
/** Як часто перечитувати `tailscale status`: мережа змінюється (хотспот, мобільний), а подій CLI не дає. */
export const TAILSCALE_POLL_MS = 30_000;
/** Скільки чекати на CLI. */
export const TAILSCALE_CLI_TIMEOUT_MS = 8_000;
/** Де шукати CLI: аппка з App Store / сайту, потім Homebrew. */
export const TAILSCALE_CLI_PATHS = ['/Applications/Tailscale.app/Contents/MacOS/Tailscale', '/opt/homebrew/bin/tailscale', '/usr/local/bin/tailscale'];

/**
 * Перемикач модуля на його вкладці. `tailscale serve` на tailnet-порт агента піднімається, лише коли модуль увімкнено
 * і на Огляді Агента вибрано «Tailscale»; інакше агент його прибирає.
 */
export const TAILSCALE_SETTINGS: SettingDefinition[] = [
  {
    type: 'switch',
    key: 'enabled',
    label: 'Увімкнено',
    hint: 'Дашборд з твоїх пристроїв у tailnet, з будь-якої мережі',
    icon: { symbol: 'point.3.connected.trianglepath.dotted', tone: 'accent' },
    scope: 'mac',
    page: TAILSCALE_PAGE,
    default: false,
  },
];
