import type { UiNode } from '@macontrol/contracts';
import { linkButton } from '../../modules/helpers/link-button';
import type { WebUiAddress } from '../types/web-ui-snapshot.types';

/**
 * Пункти Web UI в меню Dock: «Відкрити Web UI» — адреса на цьому Mac (працює завжди, поки сервер запущений), і
 * «Відкрити через Tailscale», поки Tailscale serve увімкнено. Відкриває браузер аппка, агентові нічого не шле.
 */
export function webUiDockMenu(addresses: WebUiAddress[]): UiNode[] {
  const url = (id: string) => addresses.find((address) => address.id === id)?.url ?? null;
  const buttons = [linkButton('open', 'Відкрити Web UI', url('mac')), linkButton('open-tailnet', 'Відкрити через Tailscale', url('tailnet'))].filter(
    (button) => button !== null,
  );
  return buttons.length > 0 ? [{ id: 'open', type: 'buttons', buttons }] : [];
}
