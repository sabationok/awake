import type { DevicePairingMode } from '@awake/contracts';

/**
 * Що сталося з пристроєм на шляху `via`: запит на сполучення, відповідь Mac, або вже сполучений пристрій
 * знову з'явився після перерви (`connected`, «вхід»). Модулі шляхів (Tailscale, Webhooxy) шлють з цього сповіщення.
 */
export interface PairingEvent {
  type: 'requested' | 'approved' | 'denied' | 'connected';
  via: DevicePairingMode;
  userAgent: string | null;
}
