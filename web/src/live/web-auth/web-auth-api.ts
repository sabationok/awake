import type { WebLoginBody, WebSessionInfo } from '@awake/contracts';
import { callAgent } from '@/live/pairing/agent-api';

/** Вхід у Web UI через API агента на тому ж сайті: сесію і кукі веде агент. */
export const webAuthApi = {
  session: () => callAgent<WebSessionInfo>('/api/auth/session', null),
  touch: () => callAgent<WebSessionInfo>('/api/auth/touch', null, { method: 'POST', body: '{}' }),
  login: (body: WebLoginBody) => callAgent<WebSessionInfo>('/api/auth/login', null, { method: 'POST', body: JSON.stringify(body) }),
  logout: () => callAgent<null>('/api/auth/logout', null, { method: 'POST', body: '{}' }),
};

/** Web UI відкрито через `tailscale serve`: там вхід кукі й паролем, у LAN — токен пристрою. */
export function isTailnetHost(): boolean {
  return typeof location !== 'undefined' && location.hostname.endsWith('.ts.net');
}
