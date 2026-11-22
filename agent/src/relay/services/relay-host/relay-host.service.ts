import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { io, type Socket } from 'socket.io-client';
import type { RelayHostBroadcast, RelayHostReply, UiTree } from '@awake/contracts';
import { BotJournalService } from '../../../bot-journal';
import { AGENT_CONFIG, type AgentConfig } from '../../../config/agent-config';
import { EnvifyService } from '../../../envify';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { isUiEvent } from '../../../modules/helpers/is-ui-event';
import { ModulesService } from '../../../modules/modules.service';
import { TelegramNotificationsService } from '../../../telegram/notifications';
import { TransportsService } from '../../../transports';
import { RELAY_MAX_PAYLOAD_BYTES, RELAY_RETRY_MS } from '../../constants/relay-limits';
import { RELAY_METRICS } from '../../constants/relay-metrics';
import { RELAY_PROXY_ID } from '../../constants/relay-proxy';
import { buildRelayLimits, type RelayLimitsOverride } from '../../helpers/build-relay-limits';
import { readRelayEnv } from '../../helpers/read-relay-env';
import { RELAY_STATUS_VIEW } from '../../helpers/relay-status-label';
import { RelayStateService } from '../../state/relay-state.service';
import { verifyViewerTicket } from '../../helpers/verify-viewer-ticket';
import type { RelayEnv } from '../../types/relay-env.types';
import { UsedTickets } from './used-tickets';
import { PairingService } from '../../../devices/services/pairing.service';
import { parseDeviceViewerSub } from '../../helpers/device-viewer-sub';
import { RelayRequestService, type RelayHttpRequest } from '../relay-request';

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
  /** Viewer-и, яких уже вигнали за відкликаний пристрій: список сесій зберігає й тих, хто пішов. */
  private readonly _kicked = new Set<string>();
  private _env: RelayEnv | null = null;
  private _socket?: Socket;
  private _retry?: NodeJS.Timeout;
  private _lastTree = '';
  private _maxPayloadBytes = RELAY_MAX_PAYLOAD_BYTES;

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _modules: ModulesService,
    private readonly _state: RelayStateService,
    private readonly _journal: BotJournalService,
    private readonly _notifications: TelegramNotificationsService,
    private readonly _envify: EnvifyService,
    private readonly _bridge: MacBridgeService,
    private readonly _requests: RelayRequestService,
    private readonly _pairing: PairingService,
    transports: TransportsService,
  ) {
    transports.registerProxy({
      id: RELAY_PROXY_ID,
      via: 'web',
      title: 'Webhooxy',
      icon: { symbol: 'antenna.radiowaves.left.and.right', tone: 'accent' },
      status: () => {
        const { status, reason, viewers } = _state.state;
        const label = RELAY_STATUS_VIEW[status].label;
        return { online: status === 'online', hint: status === 'online' ? `${label}, сесій: ${viewers.length}` : (reason ?? label) };
      },
    });
  }

  get isOnline(): boolean {
    return this._socket?.connected ?? false;
  }

  onModuleInit() {
    this._readEnv();
    this.setEnabled(this._modules.context('relay').setting<boolean>('enabled'));
  }

  /**
   * Аппка переписала relay.env або Envify віддав нові змінні: нові ключі діють одразу. Кімната перепідключається,
   * лише якщо ключі справді змінились (оновлення Envify з тими самими значеннями не рве сесії viewer-ів).
   */
  reloadEnv() {
    const before = JSON.stringify(this._env);
    this._readEnv();
    if (JSON.stringify(this._env) !== before) {
      this._stop();
      this.setEnabled(this._modules.context('relay').setting<boolean>('enabled'));
    }
    // Статус міг не змінитись (off → off), а «Підключення» змінилось.
    this._modules.treeChanged$.next();
  }

  private _readEnv() {
    const read = readRelayEnv(this._envify.variables);
    this._env = read.env;
    this._state.setConnection({ stage: this._config.stage, url: this._config.webhooxyUrl, envPath: read.path, keys: read.keys });
    // Аппці — звідки кожен ключ і стан Envify; значень секретів тут немає (value: null).
    this._bridge.sendSecrets({ envify: this._envify.status, relay: read.keys.map(({ name, source, secret, value }) => ({ name, source, secret, value })) });
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

  /** Select лімітів змінився: `relay:limits` повністю замінює override, тож шлемо всі поля разом. */
  async applyLimits() {
    if (!this.isOnline) return;
    const reply = (await this._socket!.emitWithAck('relay:limits', { data: this._limits() })) as ServerEnvelope<Record<string, unknown> | null>;
    if (reply.statusCode === 200 && reply.data) {
      this._onEffectiveLimits(reply);
      return;
    }
    const error = `${reply.statusCode} ${reply.message}`;
    this._logger.warn(`Relay limits rejected: ${error}`);
    this._journal.count([RELAY_METRICS.errors]);
    this._state.setLimits({ error });
    this._modules.treeChanged$.next();
    this._notifications.notify({ source: 'relay', type: 'limits', title: '⚠️ webhooxy не прийняв ліміти', fields: { error } });
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
    else {
      this._logger.warn(`Broadcast rejected: ${reply.statusCode} ${reply.message}`);
      this._journal.count([RELAY_METRICS.errors]);
    }
  }

  private _connect(url: string, env: RelayEnv) {
    const allowedOrigins = [...this._config.dashboardOrigins, this._config.corsOrigin].filter((origin): origin is string => !!origin);
    const socket = io(`${url}/relay`, {
      transports: ['websocket'],
      auth: {
        token: env.workspaceToken,
        destId: env.destId,
        relay: { allowedOrigins, ...this._limits() },
      },
      query: { mt_workspace: env.workspace },
    });
    this._socket = socket;

    socket.on('connect', () => {
      this._lastTree = '';
      this._logger.log(`Relay host online (${this._config.stage})`);
      this._journal.count([RELAY_METRICS.connects]);
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
    socket.on('relay:limits:effective', (envelope: ServerEnvelope<Record<string, unknown> | null>) => this._onEffectiveLimits(envelope));
    // Дані viewer-а не перевірені: виняток у слухачі socket.io поклав би весь агент, тож завжди відповідаємо в ack.
    socket.on('relay:authorize', (envelope: ServerEnvelope<AuthorizeData> | undefined, ack: Ack) => {
      if (typeof ack !== 'function') return;
      try {
        ack({ data: this._authorize(envelope?.data, env) });
      } catch (error) {
        this._logger.warn(`Relay authorize failed: ${(error as Error).message}`);
        ack({ data: { allow: false } });
      }
    });
    // HTTP-тунель від проксі дашборду: сполучення пристрою і квиток на сокет.
    socket.on('relay:request', (envelope: ServerEnvelope<RelayHttpRequest> | undefined, ack: Ack) => {
      if (typeof ack !== 'function') return;
      try {
        ack({ data: this._requests.handle(envelope?.data, env) });
      } catch (error) {
        this._logger.warn(`Relay request failed: ${(error as Error).message}`);
        ack({ data: { statusCode: 500, body: { ok: false, error: { code: 'INTERNAL', message: 'Internal error' } } } });
      }
    });
    socket.on('relay:message', (envelope: ServerEnvelope<unknown> | undefined, ack: Ack) => {
      if (typeof ack !== 'function') return;
      this._journal.count([RELAY_METRICS.messages]);
      void this._handle(envelope?.data)
        .catch((): RelayHostReply => ({ type: 'error', message: 'Internal error' }))
        .then((data) => ack({ data }));
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

  private _authorize(data: AuthorizeData | undefined, env: RelayEnv): { allow: boolean; sub?: string } {
    if (!data || typeof data !== 'object' || typeof data.viewerId !== 'string') return this._deny('?', 'malformed request');
    const origin = typeof data.headers?.origin === 'string' ? data.headers.origin : undefined;
    const allowedOrigins = [...this._config.dashboardOrigins, this._config.corsOrigin];
    if (origin && !allowedOrigins.includes(origin)) return this._deny(data.viewerId, `origin ${origin}`);
    const check = verifyViewerTicket(data.token, env.ticketKey, env.room);
    if (!check.ok) return this._deny(data.viewerId, check.reason);
    if (!this._used.claim(check.claims.jti, check.claims.exp)) return this._deny(data.viewerId, 'ticket reused');
    const deviceId = parseDeviceViewerSub(check.claims.sub);
    if (deviceId !== null && !this._pairing.deviceExists(deviceId)) return this._deny(data.viewerId, 'device revoked');
    this._logger.log(`Viewer ${data.viewerId} allowed (${check.claims.sub})`);
    this._journal.count([RELAY_METRICS.viewerAllowed]);
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

  /** Пристрій відкликали на Mac: його живі сесії relay виганяємо одразу, не чекаючи кінця квитка. */
  async kickRevokedDevices() {
    if (!this.isOnline) return;
    for (const viewer of this._state.state.viewers) {
      const deviceId = parseDeviceViewerSub(viewer.sub);
      if (deviceId === null || this._kicked.has(viewer.viewerId) || this._pairing.deviceExists(deviceId)) continue;
      this._kicked.add(viewer.viewerId);
      const reply = (await this._socket!.emitWithAck('relay:kick', { data: { viewerId: viewer.viewerId } })) as ServerEnvelope<unknown>;
      this._logger.log(`Kick viewer ${viewer.viewerId} (device ${deviceId} revoked): ${reply.statusCode}`);
    }
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

  /** Поля override з select-ів Webhooxy; handshake і `relay:limits` беруть одне й те саме. */
  private _limits(): RelayLimitsOverride {
    const ctx = this._modules.context('relay');
    return buildRelayLimits((key) => ctx.setting<string>(key));
  }

  private _onEffectiveLimits(envelope: ServerEnvelope<Record<string, unknown> | null>) {
    const effective = envelope.data;
    if (!effective) return;
    const maxPayloadBytes = effective.maxPayloadBytes;
    this._maxPayloadBytes = typeof maxPayloadBytes === 'number' ? maxPayloadBytes : RELAY_MAX_PAYLOAD_BYTES;
    this._state.setLimits({ effective, override: envelope.meta?.source?.override ?? false, error: null });
    this._modules.treeChanged$.next();
  }

  private _deny(viewerId: string, reason: string) {
    this._logger.warn(`Viewer ${viewerId} denied: ${reason}`);
    this._journal.count([RELAY_METRICS.viewerDenied]);
    this._notifications.notify({ source: 'relay', type: 'denied', title: '🚫 Viewer-а не пущено', fields: { viewerId, reason } });
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
          await this._modules.dispatch(message.event, 'web', { proxy: RELAY_PROXY_ID });
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
