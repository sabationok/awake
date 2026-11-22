import { Injectable } from '@nestjs/common';
import { proxyId, type AgentProxy } from './types/agent-proxy.types';
import type { AgentTransport } from './types/agent-transport.types';

/**
 * Реєстр транспортів Агента і проксі до них. Кожен реєструє себе сам у конструкторі свого провайдера:
 * Nest створює всі провайдери до першого onModuleInit, тож сторінка Агента бачить їх усі.
 */
@Injectable()
export class TransportsService {
  private readonly _byId = new Map<string, AgentTransport>();
  private readonly _proxies = new Map<string, AgentProxy>();

  register(transport: AgentTransport) {
    this._byId.set(transport.id, transport);
  }

  registerProxy(proxy: Omit<AgentProxy, 'id'>) {
    const id = proxyId(proxy.protocol, proxy.provider);
    this._proxies.set(id, { ...proxy, id });
  }

  list(): AgentTransport[] {
    return [...this._byId.values()];
  }

  proxies(): AgentProxy[] {
    return [...this._proxies.values()];
  }
}
