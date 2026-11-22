import type { UiNode, UiPage, UiSelect } from '@awake/contracts';
import type { BotMetrics } from '../../../bot-journal';
import type { AgentProxy, AgentTransport } from '../../../transports';
import type { ModuleContext } from '../../types/mac-module';
import { REMOTE_ACCESS_KEY, type RemoteAccess } from '../constants/remote-access';

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

/** Опція шляху сіра, коли його модуль вимкнено (у своїй вкладці чи жорстко в агенті). */
function remoteAccessNode(ctx: ModuleContext, available: Record<RemoteAccess, boolean>): UiNode {
  const node = ctx.settingNode(REMOTE_ACCESS_KEY) as UiSelect;
  return { ...node, options: node.options.map((option) => ({ ...option, disabled: !available[option.value as RemoteAccess] })) };
}

/**
 * «Огляд» Агента: «Віддалений доступ» (через що дашборд працює поза домашньою Wi-Fi — Tailscale чи webhooxy;
 * опція сіра, коли її модуль вимкнено) і транспорти з проксі. Сповіщення Агента — у Telegram → Сповіщення.
 */
export function buildBotOverviewPage(
  ctx: ModuleContext,
  transports: AgentTransport[],
  proxies: AgentProxy[],
  metrics: BotMetrics,
  available: Record<RemoteAccess, boolean>,
): UiPage {
  return {
    id: BOT_OVERVIEW_PAGE,
    module: 'bot',
    title: 'Огляд',
    icon: { symbol: 'gauge.with.dots.needle.67percent', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'remote',
        type: 'section',
        title: 'Віддалений доступ',
        scope: 'mac',
        footer: 'Один шлях до дашборду поза домашньою Wi-Fi. Сіра опція — її модуль вимкнено: увімкнути у вкладці Tailscale чи Webhooxy.',
        children: [remoteAccessNode(ctx, available)],
      },
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
