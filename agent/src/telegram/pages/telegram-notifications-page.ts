import type { UiNode, UiPage } from '@awake/contracts';
import type { ModuleContext } from '../../modules/types/mac-module';
import { telegramNotificationSettingKey, TELEGRAM_NOTIFICATIONS_PAGE, type TelegramNotificationSource } from '../notifications';

/**
 * Telegram → Сповіщення: вкладка на кожне джерело. Налаштування, які джерело віддає іншому (`tabOf`), стоять у
 * вкладці того модуля; джерело без власних рядків вкладки не має (немає окремого табу «Попередження»).
 */
export function buildTelegramNotificationsPage(ctx: ModuleContext, sources: TelegramNotificationSource[]): UiPage {
  const rows = new Map<string, UiNode[]>(sources.map((source) => [source.id, []]));
  for (const source of sources) {
    const keys = [
      ...source.events.map((event) => telegramNotificationSettingKey(source.id, event.type)),
      ...(source.settings ?? []).map((setting) => setting.key),
    ];
    for (const key of ordered(keys)) {
      const tab = source.tabOf?.[key] ?? source.id;
      (rows.get(tab) ?? rows.get(source.id))!.push(ctx.settingNode(key));
    }
  }
  const tabs = sources
    .filter((source) => (rows.get(source.id)?.length ?? 0) > 0)
    .map((source) => ({ id: source.id, label: source.label, children: rows.get(source.id)! }));
  return {
    id: TELEGRAM_NOTIFICATIONS_PAGE,
    module: 'telegram',
    title: 'Сповіщення',
    icon: { symbol: 'bell.fill', tone: 'accent' },
    group: 'modules',
    children: [{ id: 'events', type: 'section', title: 'Сповіщення', children: [{ id: 'events-tabs', type: 'tabs', sticky: true, tabs }] }],
  };
}

/** Ключ налаштування події, а одразу за ним його уточнення (`events.ending.awake` → `events.ending.awake.lead`). */
function ordered(keys: string[]): string[] {
  const roots = keys.filter((key) => !keys.some((other) => other !== key && key.startsWith(`${other}.`)));
  return roots.flatMap((root) => [root, ...keys.filter((key) => key.startsWith(`${root}.`))]);
}
