import type { UiNode, UiPage } from '@awake/contracts';
import type { BotMetrics } from '../../../bot-journal';
import type { AgentTransport } from '../../../transports';
import type { ModuleContext } from '../../types/mac-module';
import { BOT_NOTIFICATIONS } from '../constants/bot-notifications';

export const BOT_OVERVIEW_PAGE = 'bot-overview';

function transportNode(transport: AgentTransport, metrics: BotMetrics): UiNode {
  const { online, hint } = transport.status();
  const calls = metrics.today[`src.${transport.id}`] ?? 0;
  return {
    id: `transport-${transport.id}`,
    type: 'status',
    label: `${transport.title} · сьогодні ${calls}`,
    hint,
    tone: online ? 'green' : 'gray',
  };
}

/**
 * «Огляд» Агента: перемикач webhooxy (налаштування модуля relay), транспорти, що зареєстрували себе, і сповіщення
 * Агента в Telegram. Ліміти й трекінг webhooxy — його власна вкладка.
 */
export function buildBotOverviewPage(ctx: ModuleContext, transports: AgentTransport[], metrics: BotMetrics): UiPage {
  return {
    id: BOT_OVERVIEW_PAGE,
    module: 'bot',
    title: 'Огляд',
    icon: { symbol: 'gauge.with.dots.needle.67percent', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'webhooxy',
        type: 'section',
        title: 'Webhooxy',
        // Перемикач лише в SwiftUI: у вебі секція була б порожня.
        scope: 'mac',
        footer: 'Пускати дашборд через webhooxy, коли Mac поза домашньою мережею. Ліміти й сесії — вкладка Webhooxy.',
        children: [ctx.settingNode('enabled', 'relay')],
      },
      {
        id: 'transports',
        type: 'section',
        title: 'Транспорти',
        footer: 'Вхідні точки в того самого бота: дії з усіх ідуть в один журнал.',
        children: transports.map((transport) => transportNode(transport, metrics)),
      },
      {
        id: 'notifications',
        type: 'section',
        title: 'Сповіщення в Telegram',
        children: BOT_NOTIFICATIONS.events.map((event) => ctx.settingNode(`events.bot.${event.type}`, 'telegram')),
      },
    ],
  };
}
