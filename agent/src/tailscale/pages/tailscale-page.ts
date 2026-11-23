import type { UiNode, UiPage } from '@awake/contracts';
import { TAILSCALE_MODULE, TAILSCALE_PAGE } from '../constants/tailscale-settings';
import type { TailscaleState } from '../types/tailscale-state.types';

/** Стан Tailscale одним рядком: від «не встановлено» до «веде на агента». */
function statusNode(state: TailscaleState, active: boolean): UiNode {
  if (!state.installed) return { id: 'status', type: 'status', label: 'Tailscale не встановлено', tone: 'gray' };
  if (!state.running) return { id: 'status', type: 'status', label: 'Mac не в tailnet', tone: 'gray', hint: state.error ?? undefined };
  if (state.serving) return { id: 'status', type: 'status', label: 'Дашборд через Tailscale працює', tone: 'green' };
  return { id: 'status', type: 'status', label: active ? 'serve не піднявся' : 'У tailnet, serve вимкнено', tone: active ? 'orange' : 'gray', hint: state.error ?? undefined };
}

/**
 * Головна вкладка Tailscale: перемикач модуля, стан tailnet і адреса. Чи йде дашборд саме через Tailscale,
 * вмикають на Огляді Агента («Віддалений доступ», перемикачі); вимкнений тут модуль там сірий.
 */
export function buildTailscalePage(state: TailscaleState, enabledNode: UiNode, active: boolean): UiPage {
  return {
    id: TAILSCALE_PAGE,
    module: TAILSCALE_MODULE,
    title: 'Tailscale',
    icon: { symbol: 'point.3.connected.trianglepath.dotted', tone: 'accent' },
    group: 'modules',
    scope: 'mac',
    children: [
      {
        id: 'tailscale',
        type: 'section',
        title: 'Tailscale',
        footer: 'Дашборд і сполучення з твоїх пристроїв у tailnet з будь-якої мережі: https на *.ts.net через tailscale serve. Працює, коли модуль увімкнено і на Огляді Агента ввімкнено «Tailscale».',
        children: [
          enabledNode,
          statusNode(state, active),
          ...(state.dnsName ? [{ id: 'host', type: 'row', label: 'Адреса', value: `https://${state.dnsName}` } satisfies UiNode] : []),
        ],
      },
    ],
  };
}
