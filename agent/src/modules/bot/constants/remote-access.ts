import type { SettingDefinition } from '@macontrol/contracts';
import type { ModuleContext } from '../../types/mac-module';

/**
 * Шляхи до Web UI поза домашньою Wi-Fi. Три рівні:
 * - модуль шляху (вкладка Tailscale / Webhooxy) каже, чи шлях узагалі доступний на цьому Mac;
 * - тут, на Огляді Агента, — чи агент з ним працює (перемикачі, кілька шляхів паралельно);
 * - картка «Сполучити пристрій» у Mac-аппці — яким шляхом сполучаємось зараз (вкладки, у кожної свій QR).
 */
export type RemotePath = 'tailscale' | 'webhooxy';

export const REMOTE_ACCESS_MODULE = 'bot';
export const REMOTE_ACCESS_KEYS: Record<RemotePath, string> = { tailscale: 'remoteTailscale', webhooxy: 'remoteWebhooxy' };
export const REMOTE_PATHS = Object.keys(REMOTE_ACCESS_KEYS) as RemotePath[];

export const REMOTE_ACCESS_SETTINGS: SettingDefinition[] = [
  {
    type: 'switch',
    key: REMOTE_ACCESS_KEYS.tailscale,
    label: 'Tailscale',
    hint: 'Web UI на https://<mac>.ts.net для пристроїв у твоєму tailnet',
    icon: { symbol: 'point.3.connected.trianglepath.dotted', tone: 'accent' },
    scope: 'mac',
    page: 'bot-overview',
    default: false,
  },
  {
    type: 'switch',
    key: REMOTE_ACCESS_KEYS.webhooxy,
    label: 'Webhooxy',
    hint: "Канал зв'язку через relay webhooxy",
    icon: { symbol: 'arrow.triangle.branch', tone: 'accent' },
    scope: 'mac',
    page: 'bot-overview',
    default: false,
  },
];

/** Шлях, якому належить ключ налаштування; null — не перемикач шляху. */
export function remotePathOf(key: string): RemotePath | null {
  return REMOTE_PATHS.find((path) => REMOTE_ACCESS_KEYS[path] === key) ?? null;
}

/** Агент працює з цим шляхом (перемикач на Огляді). Доступність самого шляху перевіряє його модуль. */
export function isRemoteAllowed(ctx: ModuleContext, path: RemotePath): boolean {
  return ctx.setting<boolean>(REMOTE_ACCESS_KEYS[path], REMOTE_ACCESS_MODULE);
}

/** Зміна, після якої шлях треба перевірити: його перемикач на Огляді. */
export function isRemoteChange(change: { module: string; key: string }, path: RemotePath): boolean {
  return change.module === REMOTE_ACCESS_MODULE && change.key === REMOTE_ACCESS_KEYS[path];
}
