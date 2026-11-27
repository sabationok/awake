import type { UiTree } from '@awake/contracts';
import { FIXTURE_MODULES } from './modules';
import { awakeSleepKeepersPages } from './pages/awake-sleep-keepers';
import { macMediaProximityPages } from './pages/mac-media-proximity';
import { networkSettingsPages } from './pages/network-settings';
import { telegramGroupsBotPages } from './pages/telegram-groups-bot';

/** Коли фікстури звірено з білдерами сторінок агента (коміт aa333fb: групи під Telegram, хлібні крихти). */
export const FIXTURE_SAMPLED_AT = '2026-11-27';

/**
 * Демо-дерево у формі `GET /api/ui`. Сторінки віддзеркалюють білдери агента. Віддає його сервер (`/api/tree`),
 * коли ні Upstash, ні Web Swift не дали живого дерева.
 */
export function fixtureTree(): UiTree {
  return {
    modules: FIXTURE_MODULES,
    app: { title: 'MaControl', host: 'MacBook Pro', online: true, updatedAt: new Date().toISOString() },
    pages: [...awakeSleepKeepersPages(), ...macMediaProximityPages(), ...telegramGroupsBotPages(), ...networkSettingsPages()],
  };
}
