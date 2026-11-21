import { Injectable } from '@nestjs/common';
import type { AgentTransport } from './types/agent-transport.types';

/**
 * Реєстр транспортів Агента. Кожен транспорт реєструє себе сам у конструкторі свого провайдера:
 * Nest створює всі провайдери до першого onModuleInit, тож сторінка Агента бачить їх усі.
 */
@Injectable()
export class TransportsService {
  private readonly _byId = new Map<string, AgentTransport>();

  register(transport: AgentTransport) {
    this._byId.set(transport.id, transport);
  }

  list(): AgentTransport[] {
    return [...this._byId.values()];
  }
}
