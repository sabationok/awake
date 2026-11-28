import type { UiTone } from '@macontrol/contracts';
import type { ModuleSource } from '../../modules/types/module-source';

/** Стан транспорту для сторінки Агента. */
export interface AgentTransportStatus {
  online: boolean;
  /** Коротко, чому так: адреса, причина обриву, «бот вимкнено». */
  hint?: string;
}

/**
 * Вхідна точка в нашого бота: Mac, веб, Telegram. Проксі до транспорту (webhooxy) — AgentProxy. Дії з неї йдуть у той самий
 * ModulesService.dispatch з `source = id`, тож журнал і статистика рахують їх окремо.
 */
export interface AgentTransport {
  id: ModuleSource;
  title: string;
  icon: { symbol: string; tone: UiTone };
  status(): AgentTransportStatus;
}
