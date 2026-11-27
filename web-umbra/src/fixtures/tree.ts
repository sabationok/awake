import type { UiTree } from '@awake/contracts';
import { FIXTURE_MODULES } from './modules';
import { awakeSleepKeepersPages } from './pages/awake-sleep-keepers';
import { macMediaProximityPages } from './pages/mac-media-proximity';
import { networkSettingsPages } from './pages/network-settings';
import { telegramGroupsBotPages } from './pages/telegram-groups-bot';

/**
 * Демо-дерево у формі `GET /api/ui`. Сторінки віддзеркалюють білдери агента; коли Umbra перейде на живі дані,
 * цей файл замінить один fetch, а рендерер лишиться як є.
 */
export function fixtureTree(): UiTree {
  return {
    modules: FIXTURE_MODULES,
    app: { title: 'MaControl', host: 'MacBook Pro', online: true, updatedAt: new Date().toISOString() },
    pages: [...awakeSleepKeepersPages(), ...macMediaProximityPages(), ...telegramGroupsBotPages(), ...networkSettingsPages()],
  };
}
