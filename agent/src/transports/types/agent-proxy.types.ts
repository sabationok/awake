import type { UiTone } from '@awake/contracts';
import type { ModuleSource } from '../../modules/types/module-source';
import type { AgentTransportStatus } from './agent-transport.types';

/**
 * Проксі до транспорту: інший шлях до того самого джерела (webhooxy, далі, може, Cloudflare Tunnel).
 * Виклики через нього йдуть як `source = via` з `proxy = id`, тож журнал і статистика бачать і транспорт, і шлях.
 */
export interface AgentProxy {
  id: string;
  title: string;
  icon: { symbol: string; tone: UiTone };
  /** Транспорт, до якого веде проксі. */
  via: ModuleSource;
  status(): AgentTransportStatus;
}
