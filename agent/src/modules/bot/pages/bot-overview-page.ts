import type { UiNode, UiPage, UiSwitch } from '@awake/contracts';
import type { BotMetrics } from '../../../bot-journal';
import type { AgentProxy, AgentTransport } from '../../../transports';
import type { ModuleContext } from '../../types/mac-module';
import { AGENT_ENABLED_KEY } from '../constants/agent-enabled';
import { REMOTE_ACCESS_KEYS, REMOTE_PATHS, type RemotePath } from '../constants/remote-access';

export const BOT_OVERVIEW_PAGE = 'bot-overview';

/** Транспорт чи проксі: назва ліворуч, стан словом праворуч, у коментарі — виклики за сьогодні і пояснення. */
function statusNode(id: string, title: string, calls: number, status: { online: boolean; hint?: string }): UiNode {
  return {
    id,
    type: 'item',
    title,
    status: status.online ? { label: 'Працює', tone: 'green' } : { label: 'Не працює', tone: 'gray' },
    comment: [`Сьогодні ${calls}`, status.hint].filter(Boolean).join(' · '),
  };
}

/** Транспорт, а під ним — проксі, що ведуть до нього: виклики через проксі входять і в лічильник транспорту. */
function transportNodes(transport: AgentTransport, proxies: AgentProxy[], metrics: BotMetrics): UiNode[] {
  const calls = metrics.today[`src.${transport.id}`] ?? 0;
  return [
    statusNode(`transport-${transport.id}`, transport.title, calls, transport.status()),
    ...proxies
      .filter((proxy) => proxy.via === transport.id)
      .map((proxy) =>
        statusNode(`proxy-${proxy.id}`, `↳ ${proxy.id} (проксі)`, metrics.today[`proxy.${proxy.id}`] ?? 0, proxy.status()),
      ),
  ];
}

/** Перемикач шляху сірий, коли його модуль вимкнено (у своїй вкладці чи жорстко в агенті); вимкнений шлях — вимкнений. */
function remoteAccessNodes(ctx: ModuleContext, available: Record<RemotePath, boolean>): UiNode[] {
  return REMOTE_PATHS.map((path) => {
    const node = ctx.settingNode(REMOTE_ACCESS_KEYS[path]) as UiSwitch;
    return available[path] ? node : { ...node, value: false, disabled: true };
  });
}

/**
 * «Огляд» Агента: вмикач агента, «Віддалений доступ» (перемикачі шляхів поза домашньою Wi-Fi — Tailscale, webhooxy;
 * сірий, коли модуль шляху вимкнено) і транспорти з проксі. Сповіщення Агента — у Telegram → Сповіщення.
 */
export function buildBotOverviewPage(
  ctx: ModuleContext,
  transports: AgentTransport[],
  proxies: AgentProxy[],
  metrics: BotMetrics,
  available: Record<RemotePath, boolean>,
): UiPage {
  return {
    id: BOT_OVERVIEW_PAGE,
    module: 'bot',
    title: 'Огляд',
    icon: { symbol: 'gauge.with.dots.needle.67percent', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'agent',
        type: 'section',
        title: 'Агент',
        scope: 'mac',
        footer: 'Вимкнений агент не приймає дій і команд з Web UI і Telegram. Сервер, фонові задачі й ця аппка працюють далі.',
        children: [ctx.settingNode(AGENT_ENABLED_KEY)],
      },
      {
        id: 'remote',
        type: 'section',
        title: 'Віддалений доступ',
        scope: 'mac',
        footer: 'З якими шляхами до Web UI поза домашньою Wi-Fi працює агент; можна кілька. Сірий — його модуль вимкнено: увімкнути у вкладці Tailscale чи Webhooxy. Яким шляхом сполучити пристрій — у картці «Сполучити пристрій».',
        children: remoteAccessNodes(ctx, available),
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
