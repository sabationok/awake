import type { UiNode, UiPage } from '@awake/contracts';
import type { BotMetrics } from '../../../bot-journal';
import type { AgentProxy, AgentTransport } from '../../../transports';
import type { ModuleContext } from '../../types/mac-module';

export const BOT_OVERVIEW_PAGE = 'bot-overview';

function statusNode(id: string, label: string, status: { online: boolean; hint?: string }): UiNode {
  return { id, type: 'status', label, hint: status.hint, tone: status.online ? 'green' : 'gray' };
}

/** Транспорт, а під ним — проксі, що ведуть до нього: виклики через проксі входять і в лічильник транспорту. */
function transportNodes(transport: AgentTransport, proxies: AgentProxy[], metrics: BotMetrics): UiNode[] {
  const calls = metrics.today[`src.${transport.id}`] ?? 0;
  return [
    statusNode(`transport-${transport.id}`, `${transport.title} · сьогодні ${calls}`, transport.status()),
    ...proxies
      .filter((proxy) => proxy.via === transport.id)
      .map((proxy) =>
        statusNode(`proxy-${proxy.id}`, `↳ ${proxy.id} (проксі) · сьогодні ${metrics.today[`proxy.${proxy.id}`] ?? 0}`, proxy.status()),
      ),
  ];
}

/**
 * «Огляд» Агента. Підключення агента (вмикач, адреса) малює SwiftUI над цією сторінкою; тут — перемикачі проксі
 * (Tailscale — модуль tailscale, webhooxy — модуль relay, лише коли його ввімкнено в агенті) і транспорти з проксі. Сповіщення Агента — у Telegram → Сповіщення.
 */
export function buildBotOverviewPage(
  ctx: ModuleContext,
  transports: AgentTransport[],
  proxies: AgentProxy[],
  metrics: BotMetrics,
  options: { webhooxy: boolean },
): UiPage {
  return {
    id: BOT_OVERVIEW_PAGE,
    module: 'bot',
    title: 'Огляд',
    icon: { symbol: 'gauge.with.dots.needle.67percent', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'tailscale',
        type: 'section',
        title: 'Tailscale',
        scope: 'mac',
        footer: 'Дашборд і сполучення з твоїх пристроїв у tailnet з будь-якої мережі: https на *.ts.net через tailscale serve.',
        children: [ctx.settingNode('enabled', 'tailscale')],
      },
      ...(options.webhooxy ? [{
        id: 'webhooxy',
        type: 'section',
        title: 'Webhooxy',
        // Перемикач лише в SwiftUI: у вебі секція була б порожня.
        scope: 'mac',
        footer: 'Проксі до вебдашборду, коли Mac поза домашньою мережею. Хост, ліміти й сесії — вкладки Webhooxy.',
        children: [ctx.settingNode('enabled', 'relay')],
      } satisfies UiNode] : []),
      {
        id: 'transports',
        type: 'section',
        title: 'Транспорти',
        footer: 'Вхідні точки в того самого бота: дії з усіх ідуть в один журнал. Проксі — інший шлях до транспорту.',
        children: transports.flatMap((transport) => transportNodes(transport, proxies, metrics)),
      },
    ],
  };
}
