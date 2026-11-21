import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { io, type Socket } from 'socket.io-client';
import type { RelayHostBroadcast, RelayHostReply, UiTree } from '@awake/contracts';
import { AGENT_CONFIG, type AgentConfig } from '../../../config/agent-config';
import { isUiEvent } from '../../../modules/helpers/is-ui-event';
import { ModulesService } from '../../../modules/modules.service';
import { RELAY_MAX_PAYLOAD_BYTES, RELAY_MAX_VIEWERS, RELAY_RETRY_MS } from '../../constants/relay-limits';
import { readRelayEnv } from '../../helpers/read-relay-env';
import { RelayStateService } from '../../state/relay-state.service';
import { verifyViewerTicket } from '../../helpers/verify-viewer-ticket';
import type { RelayEnv } from '../../types/relay-env.types';
import { UsedTickets } from './used-tickets';

/** Конверт webhooxy: від сервера `{ statusCode, message, data, meta? }`, від клієнта `{ data }`. */
interface ServerEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: { from?: string; source?: { override?: boolean } };
}
type Ack = (reply: { data: unknown }) => void;

interface AuthorizeData {
  viewerId: string;
  token: string;
  headers?: Record<string, string | undefined>;
}

/**
 * Host кімнати relay у webhooxy (docs/relay-contract.md): пускає viewer-ів за квитком дашборду,
 * виконує їхні події через ModulesService і розсилає нове дерево після змін.
 */
@Injectable()
export class RelayHostService implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(RelayHostService.name);
  private readonly _used = new UsedTickets();
  private _env: RelayEnv | null = null;
  private _socket?: Socket;
  private _retry?: NodeJS.Timeout;
  private _lastTree = '';
  private _maxPayloadBytes = RELAY_MAX_PAYLOAD_BYTES;

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _modules: ModulesService,
    private readonly _state: RelayStateService,
  ) {}

  get isOnline(): boolean {
    return this._socket?.connected ?? false;
  }

  onModuleInit() {
    this._env = readRelayEnv();
    this.setEnabled(this._modules.context('relay').setting<boolean>('enabled'));
  }

  onModuleDestroy() {
    this._stop();
  }

  /** Перемикач `relay.enabled` (Mac або Telegram): підключає або відпускає кімнату. */
  setEnabled(enabled: boolean) {
    if (!enabled) {
      this._stop();
      this._setStatus('off');
      return;
    }
    if (!this._env || !this._config.webhooxyUrl) {
      this._setStatus('unconfigured', 'Немає relay.env або webhooxy для цього stage');
      return;
    }
    if (this._socket) return;
    this._setStatus('connecting');
    this._connect(this._config.webhooxyUrl, this._env);
  }

  /** Розсилає дерево авторизованим viewer-ам, якщо воно змінилося. */
  async broadcastTree() {
    if (!this.isOnline) return;
    const tree = await this._modules.buildTree('all');
    const fingerprint = JSON.stringify({ ...tree, app: { ...tree.app, updatedAt: '' } });
    if (fingerprint === this._lastTree) return;
    const data: RelayHostBroadcast = { type: 'tree', tree };
    if (!this._fits(data)) return;
    const reply = (await this._socket!.emitWithAck('relay:broadcast', { data })) as ServerEnvelope<unknown>;
    if (reply.statusCode === 200) this._lastTree = fingerprint;
    else this._logger.warn(`Broadcast rejected: ${reply.statusCode} ${reply.message}`);
  }

  private _connect(url: string, env: RelayEnv) {
    const allowedOrigins = [...this._config.dashboardOrigins, this._config.corsOrigin].filter((origin): origin is string => !!origin);
    const socket = io(`${url}/relay`, {
      transports: ['websocket'],
      auth: {
        token: env.workspaceToken,
        destId: env.destId,
        relay: { allowedOrigins, maxViewers: RELAY_MAX_VIEWERS, maxPayloadBytes: RELAY_MAX_PAYLOAD_BYTES },
      },
      query: { mt_workspace: env.workspace },
    });
    this._socket = socket;

    socket.on('connect', () => {
      this._lastTree = '';
      this._logger.log(`Relay host online (${this._config.stage})`);
      this._setStatus('online');
    });
    socket.on('connect_error', (error) => this._onConnectError(socket, error));
    socket.on('disconnect', (reason) => {
      // Новий host витіснив нас: не боремося за кімнату в циклі.
      if (reason === 'io client disconnect') return;
      if (reason === 'io server disconnect') {
        this._logger.warn('Relay host evicted by another host; staying offline');
        this._setStatus('evicted');
        return;
      }
      this._logger.warn(`Relay host disconnected: ${reason}`);
      this._setStatus('offline', reason);
    });
    socket.on('relay:limits:effective', (envelope: ServerEnvelope<{ maxPayloadBytes?: number }>) => {
      this._maxPayloadBytes = envelope.data?.maxPayloadBytes ?? this._maxPayloadBytes;
    });
    socket.on('relay:authorize', (envelope: ServerEnvelope<AuthorizeData>, ack: Ack) => ack({ data: this._authorize(envelope.data, env) }));
    socket.on('relay:message', (envelope: ServerEnvelope<unknown>, ack: Ack) => {
      void this._handle(envelope.data).then((data) => ack({ data }));
    });
  }

  /** Відмову middleware socket.io сам не повторює: RATE_LIMITED пробуємо пізніше, решту лишаємо. */
  private _onConnectError(socket: Socket, error: Error) {
    if (socket.active) {
      this._setStatus('offline', error.message);
      return;
    }
    this._logger.warn(`Relay handshake refused: ${error.message}`);
    this._setStatus('refused', error.message);
    if (error.message === 'RATE_LIMITED' || error.message === 'ROOM_FULL') {
      this._retry = setTimeout(() => socket.connect(), RELAY_RETRY_MS);
    }
  }

  private _authorize(data: AuthorizeData, env: RelayEnv): { allow: boolean; sub?: string } {
    const origin = data.headers?.origin;
    const allowedOrigins = [...this._config.dashboardOrigins, this._config.corsOrigin];
    if (origin && !allowedOrigins.includes(origin)) return this._deny(data.viewerId, `origin ${origin}`);
    const check = verifyViewerTicket(data.token, env.ticketKey, env.room);
    if (!check.ok) return this._deny(data.viewerId, check.reason);
    if (!this._used.claim(check.claims.jti, check.claims.exp)) return this._deny(data.viewerId, 'ticket reused');
    this._logger.log(`Viewer ${data.viewerId} allowed (${check.claims.sub})`);
    this._state.addViewer({
      viewerId: data.viewerId,
      sub: check.claims.sub,
      origin: origin ?? null,
      userAgent: data.headers?.['user-agent'] ?? null,
      // Кожен viewer relay приходить через webhooxy; заголовок від viewer-а підробний, тож не читаємо його.
      proxy: 'webhooxy',
      authorizedAt: new Date().toISOString(),
    });
    this._modules.treeChanged$.next();
    return { allow: true, sub: check.claims.sub };
  }

  private _stop() {
    clearTimeout(this._retry);
    this._socket?.removeAllListeners();
    this._socket?.disconnect();
    this._socket = undefined;
  }

  private _setStatus(...args: Parameters<RelayStateService['setStatus']>) {
    const before = this._state.state;
    this._state.setStatus(...args);
    if (this._state.state !== before) this._modules.treeChanged$.next();
  }

  private _deny(viewerId: string, reason: string) {
    this._logger.warn(`Viewer ${viewerId} denied: ${reason}`);
    return { allow: false };
  }

  private async _handle(data: unknown): Promise<RelayHostReply> {
    const message = data as { type?: unknown; event?: unknown } | null;
    try {
      switch (message?.type) {
        case 'ping':
          return { type: 'pong' };
        case 'tree': {
          const reply: RelayHostReply = { type: 'tree', tree: await this._modules.buildTree('all') };
          return this._fits(reply) ? reply : { type: 'error', message: 'Tree too large for relay' };
        }
        case 'event':
          if (!isUiEvent(message.event)) return { type: 'error', message: 'Invalid UI event' };
          await this._modules.dispatch(message.event, 'web');
          void this.broadcastTree();
          return { type: 'accepted' };
        default:
          return { type: 'error', message: 'Unknown relay message' };
      }
    } catch (error) {
      return { type: 'error', message: (error as Error).message };
    }
  }

  private _fits(data: { type: 'tree'; tree: UiTree } | RelayHostReply): boolean {
    const size = Buffer.byteLength(JSON.stringify({ data }));
    if (size <= this._maxPayloadBytes) return true;
    this._logger.warn(`Relay tree is ${size} bytes, over maxPayloadBytes ${this._maxPayloadBytes}`);
    return false;
  }
}
