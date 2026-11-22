import type { UiTone } from '@awake/contracts';
import type { ModuleSource } from '../../modules/types/module-source';
import type { AgentTransportStatus } from './agent-transport.types';

/** Чим проксі веде до транспорту. */
export type AgentProxyProtocol = 'http' | 'ws';

/** Id проксі: `<protocol>:<provider>` (`ws:webhooxy`, `http:webhooxy`, `http:tailscale`). */
export function proxyId(protocol: AgentProxyProtocol, provider: string): string {
  return `${protocol}:${provider}`;
}

/**
 * Проксі до транспорту: інший, не прямий шлях до того самого джерела (webhooxy, Tailscale).
 * Виклики через нього йдуть як `source = via` з `proxy = id`, тож журнал і статистика бачать і транспорт, і шлях.
 */
export interface AgentProxy {
  /** `proxyId(protocol, provider)`. */
  id: string;
  protocol: AgentProxyProtocol;
  provider: string;
  title: string;
  icon: { symbol: string; tone: UiTone };
  /** Транспорт, до якого веде проксі. */
  via: ModuleSource;
  status(): AgentTransportStatus;
}
