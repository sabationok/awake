import type { UiNode, UiPage } from '@awake/contracts';
import { settingControl } from '../../modules/helpers/menu-item';
import { TAILSCALE_MODULE, TAILSCALE_PAGE } from '../constants/tailscale-settings';
import type { TailscaleState } from '../types/tailscale-state.types';

/** Стан Tailscale одним рядком: від «не встановлено» до «не піднявся serve». «Web UI працює» сюди не входить: це не стан модуля. */
function statusNode(state: TailscaleState, active: boolean): UiNode | null {
  const item = (label: string, tone: 'gray' | 'orange', comment?: string): UiNode => ({
    id: 'status',
    type: 'item',
    title: 'Tailnet',
    status: { label, tone },
    ...(comment ? { comment } : {}),
  });
  if (!state.installed) return item('Не встановлено', 'gray', 'Tailscale не встановлено на цьому Mac.');
  if (!state.running) return item('Mac не в tailnet', 'gray', state.error ?? undefined);
  if (state.serving) return null;
  return active ? item('serve не піднявся', 'orange', state.error ?? undefined) : item('serve вимкнено', 'gray', state.error ?? 'Mac у tailnet, але serve вимкнено.');
}

/**
 * Головна вкладка Tailscale: перемикач модуля, стан tailnet і адреса. Чи йде Web UI саме через Tailscale,
 * вмикають на Огляді Агента («Віддалений доступ», перемикачі); вимкнений тут модуль там сірий.
 */
export function buildTailscalePage(state: TailscaleState, enabledNode: UiNode, active: boolean): UiPage {
  const control = settingControl(enabledNode);
  // Рядок модуля: перемикач праворуч і статус «Працює» / «Вимкнено»
  const moduleRow: UiNode = control && enabledNode.type === 'switch'
    ? {
        id: enabledNode.id,
        type: 'item',
        title: enabledNode.label,
        comment: enabledNode.hint,
        // «Працює» лише коли serve справді віддає https; інакше причину каже рядок стану нижче.
        status: !enabledNode.value
          ? { label: 'Вимкнено', tone: 'gray' }
          : state.serving
            ? { label: 'Працює', tone: 'green' }
            : { label: 'Не працює', tone: 'orange' },
        control,
      }
    : enabledNode;
  const status = statusNode(state, active);
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
        footer: 'Web UI і сполучення з твоїх пристроїв у tailnet з будь-якої мережі: https на *.ts.net через tailscale serve.',
        children: [
          moduleRow,
          ...(status ? [status] : []),
          ...(state.dnsName ? [{ id: 'host', type: 'item', title: 'Адреса', copy: { value: `https://${state.dnsName}` } } satisfies UiNode] : []),
        ],
      },
    ],
  };
}
