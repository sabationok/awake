import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { BehaviorSubject, Subject } from 'rxjs';
import type {
  ProximityReport,
  AgentToMacMessage,
  ChartTick,
  SettingValue,
  UiEvent,
  UiLayoutRequest,
  UiPageLayout,
  UiShell,
  CommandRequest,
  PermissionsSnapshot,
  HelperAction,
  HelperState,
  MacState,
  MacToAgentMessage,
  SessionSource,
  SleepTimerEvent,
  DevicesSnapshot,
  SecretsSnapshot,
  ServerCharts,
  ServerChartsTick,
  ServerInfo,
  StatsPeriod,
  WebhookAction,
  WebhookInfo,
} from '@awake/contracts';
import { HELPER_ACTIONS } from '@awake/contracts';
import { AGENT_CONFIG, AgentConfig } from '../../config/agent-config';
import { MacHelperService } from '../../mac-helper/mac-helper.service';
import { MacAppChannelService } from './mac-app-channel.service';
import { writeProtocolLine } from './protocol-stdout';

type SessionMessage = Extract<MacToAgentMessage, { type: 'session' }>['data'];
type LogMessage = Extract<MacToAgentMessage, { type: 'log' }>['data'];
type DevicesRequest = Extract<MacToAgentMessage, { type: 'devices' }>['data'];
/** Поля сесій у стані Mac. */
export type MacSessionFields = Pick<MacState, 'active' | 'until' | 'startedAt' | 'duration' | 'sleepStartedAt' | 'sleepAt'>;

export interface ServerCommand {
  command: CommandRequest;
  source: SessionSource;
}

/**
 * Що сервер приймає від аппки-клієнта. `log` — її власні рядки журналу (збережено ключі, видано дозвіл).
 * Wi-Fi і Bluetooth дає помічник. `proximity` і `wifi` від аппки лишаються лише для старої аппки (archive/mac-old),
 * поки вона ще клієнт зі своїм старим помічником: беремо їх, тільки коли помічник сам цього не дає.
 * TODO(cutover): прибрати разом зі старою аппкою.
 */
const CLIENT_TYPES: ReadonlySet<MacToAgentMessage['type']> = new Set([
  'event',
  'layout.get',
  'log',
  'devices',
  'relayEnv',
  'envify',
  'trustedNetworks',
  'webhooks',
  'serverCharts',
  'proximity',
  'wifi',
]);

const NO_SESSIONS: MacSessionFields = { active: false, until: null, startedAt: null, duration: null, sleepStartedAt: null, sleepAt: null };
/** Версії аппки без аппки немає. */
const STANDALONE_APP_VERSION = 'без аппки';

type TrustedNetworksRequest = Extract<MacToAgentMessage, { type: 'trustedNetworks' }>['data'];

/** Mac вважається офлайн, якщо стан не приходив довше за цей час. */
const STATE_STALE_MS = 30_000;

/**
 * Канал з Mac: інші модулі підписуються на потоки і шлють команди сюди, а не в сам транспорт.
 * Транспортів два. Старий: сервер — підпроцес Mac-аппки, JSON-рядки через stdin / stdout.
 * Новий (`standalone`): сервер працює сам, стан і системні дії йдуть через помічник (MacHelperService),
 * а stdin / stdout протоколом не є.
 */
@Injectable()
export class MacBridgeService implements OnModuleInit {
  private readonly _logger = new Logger(MacBridgeService.name);
  readonly state$ = new BehaviorSubject<MacState | null>(null);
  readonly sessions$ = new Subject<SessionMessage>();
  readonly sleepTimers$ = new Subject<SleepTimerEvent>();
  readonly logs$ = new Subject<LogMessage>();
  /** Натискання в SwiftUI-рендерері Mac-аппки. */
  readonly events$ = new Subject<UiEvent>();
  /** Аппка відкрила сторінку (`layout.get`). */
  readonly layoutRequests$ = new Subject<UiLayoutRequest>();
  /** Запити сторінки «Пристрої» Mac-аппки. */
  readonly devices$ = new Subject<DevicesRequest>();
  /** Модалка вебхука: зберегти, увімкнути, вимкнути, прибрати. */
  readonly webhooks$ = new Subject<WebhookAction>();
  /** Аппка переписала secrets.env (або старий relay.env). */
  readonly relayEnvReload$ = new Subject<void>();
  /** Аппка переписала envify.env або натиснула «Оновити». */
  readonly envifyReload$ = new Subject<void>();
  /** Аппка додала або прибрала довірену мережу. */
  readonly trustedNetworks$ = new Subject<TrustedNetworksRequest>();
  /** Bluetooth-пристрої поруч від аппки (кожні кілька секунд, поки ввімкнено «Поруч»). */
  readonly proximity$ = new Subject<ProximityReport>();
  /** Сторінка «Сервер» відкрилась або змінився період графіків. */
  readonly serverCharts$ = new Subject<{ period: StatsPeriod }>();
  private _stateAt = 0;
  /**
   * Лише standalone: дії, які не є примітивом помічника (сесії, налаштування). Їх виконує MacSessionsService.
   * Зі старим транспортом вони йдуть в аппку.
   */
  readonly serverCommands$ = new Subject<ServerCommand>();
  private _helperState: HelperState | null = null;
  private _sessionFields: MacSessionFields = NO_SESSIONS;
  /** Назва Wi-Fi від старої аппки-клієнта: лише коли помічник її не бачить (див. CLIENT_TYPES). */
  private _clientSsid: string | null = null;
  /** Помічник сам сканує Bluetooth: звіти старої аппки тоді не беремо. */
  private _helperProximity = false;

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _helper: MacHelperService,
    private readonly _app: MacAppChannelService,
  ) {}

  onModuleInit() {
    if (this._config.standalone) {
      this._helper.state$.subscribe((state) => {
        this._helperState = state;
        if (state) this._emitState();
      });
      this._helper.proximity$.subscribe((report) => {
        this._helperProximity = true;
        this.proximity$.next(report);
      });
      this._app.lines$.subscribe((line) => this._handleLine(line, CLIENT_TYPES));
      this._app.empty$.subscribe(() => (this._clientSsid = null));
      this._helper.start();
      this._app.start();
      return;
    }
    const lines = createInterface({ input: process.stdin });
    lines.on('line', (line) => this._handleLine(line));
    // Mac-аппка закрилась: агенту більше нема кому служити. SIGTERM, а не process.exit: так спрацюють
    // shutdown-хуки (enableShutdownHooks), зокрема останній flush статистики.
    lines.on('close', () => {
      this._logger.log('stdin closed, exiting');
      process.kill(process.pid, 'SIGTERM');
    });
  }

  get state(): MacState | null {
    return Date.now() - this._stateAt < STATE_STALE_MS ? this.state$.value : null;
  }

  sendReady(port: number) {
    this._send({ type: 'ready', data: { port } });
  }

  sendCommand(command: CommandRequest, source: SessionSource): string {
    const id = randomUUID();
    if (this._config.standalone) this._runOnHelper(command, source);
    else this._send({ type: 'command', data: { ...command, id, source } });
    return id;
  }

  sendShell(shell: UiShell) {
    this._send({ type: 'shell', data: shell });
  }

  sendPage(page: UiPageLayout) {
    this._send({ type: 'layout.page', data: page });
  }

  sendPageNotModified(pageId: string, rev: string) {
    this._send({ type: 'layout.notModified', data: { pageId, rev } });
  }

  sendPageNotFound(pageId: string) {
    this._send({ type: 'layout.notFound', data: { pageId } });
  }

  sendSettings(settings: Record<string, SettingValue>) {
    this._send({ type: 'settings', data: settings });
  }

  sendDevices(snapshot: DevicesSnapshot) {
    this._send({ type: 'devices', data: snapshot });
  }

  sendTrustedNetworks(ssids: string[]) {
    this._send({ type: 'trustedNetworks', data: { ssids } });
  }

  sendServerInfo(info: ServerInfo) {
    this._send({ type: 'server', data: info });
  }

  sendServerCharts(charts: ServerCharts) {
    this._send({ type: 'serverCharts', data: charts });
  }

  sendServerChartsTick(tick: ServerChartsTick) {
    this._send({ type: 'serverChartsTick', data: tick });
  }

  sendChartTick(tick: ChartTick) {
    this._send({ type: 'chartTick', data: tick });
  }

  sendWebhooks(webhooks: WebhookInfo[]) {
    this._send({ type: 'webhooks', data: { webhooks } });
  }

  sendPermissions(snapshot: PermissionsSnapshot) {
    this._send({ type: 'permissions', data: snapshot });
  }

  sendSecrets(snapshot: SecretsSnapshot) {
    this._send({ type: 'secrets', data: snapshot });
  }

  private _send(message: AgentToMacMessage) {
    // Аппка тут клієнт на сокеті; команд їй сервер не шле, системне виконує помічник.
    if (this._config.standalone) {
      if (message.type !== 'command') this._app.send(message);
      return;
    }
    writeProtocolLine(message);
  }

  /** Лише standalone: сесії веде сервер і кладе їх поля в стан Mac. Стан одразу йде підписникам. */
  setSessionFields(fields: MacSessionFields) {
    this._sessionFields = fields;
    this._emitState();
  }

  private _emitState() {
    const helper = this._helperState;
    if (!helper) return;
    this._stateAt = Date.now();
    const state: MacState = { ...helper, ...this._sessionFields, ssid: helper.ssid ?? this._clientSsid, appVersion: STANDALONE_APP_VERSION };
    this.state$.next(state);
    this._app.send({ type: 'state', data: state });
  }

  /** Примітиви виконує помічник, решту (сесії, налаштування) — сервер. */
  private _runOnHelper(command: CommandRequest, source: SessionSource) {
    if (!isHelperAction(command.action)) {
      this.serverCommands$.next({ command, source });
      return;
    }
    const value = typeof command.value === 'string' ? undefined : command.value;
    void this._helper.run(command.action, value).then((result) => {
      if (result.ok) return;
      const text = `Помічник не виконав «${command.action}»: ${result.error ?? 'невідома помилка'}`;
      this._logger.warn(text);
      this.logs$.next({ at: new Date().toISOString(), text });
    });
  }

  /** `allowed` — які типи приймаємо: від аппки-клієнта лише натискання й запити, не стан і не сесії. */
  private _handleLine(line: string, allowed?: ReadonlySet<MacToAgentMessage['type']>) {
    if (!line.trim()) return;
    let message: MacToAgentMessage;
    try {
      message = JSON.parse(line) as MacToAgentMessage;
    } catch {
      this._logger.warn(`bad line from Mac: ${line.slice(0, 200)}`);
      return;
    }
    if (allowed && !allowed.has(message.type)) return;
    switch (message.type) {
      case 'wifi':
        if (this._clientSsid === message.data.ssid) return;
        this._clientSsid = message.data.ssid;
        this._emitState();
        return;
      case 'state':
        this._stateAt = Date.now();
        this.state$.next(message.data);
        return;
      case 'session':
        this.sessions$.next(message.data);
        return;
      case 'sleepTimer':
        this.sleepTimers$.next(message.data);
        return;
      case 'log':
        this.logs$.next(message.data);
        return;
      case 'event':
        this.events$.next(message.data);
        return;
      case 'layout.get':
        this.layoutRequests$.next(message.data);
        return;
      case 'devices':
        this.devices$.next(message.data);
        return;
      case 'relayEnv':
        this.relayEnvReload$.next();
        return;
      case 'envify':
        this.envifyReload$.next();
        return;
      case 'trustedNetworks':
        this.trustedNetworks$.next(message.data);
        return;
      case 'proximity':
        if (allowed && this._helperProximity) return;
        this.proximity$.next(message.data);
        return;
      case 'webhooks':
        this.webhooks$.next(message.data);
        return;
      case 'serverCharts':
        this.serverCharts$.next(message.data);
        return;
    }
  }
}

/**
 * Лише сервер: сканування Bluetooth вмикає ProximityListener, запит дозволу macOS — сторінка «Дозволи»
 * (дія `permissions.requestAccess`, тільки з аппки на Mac). Клієнт їх напряму не замовляє.
 */
const SERVER_ONLY_HELPER_ACTIONS: readonly HelperAction[] = ['bluetoothScan', 'requestAccess'];
const CLIENT_HELPER_ACTIONS: readonly HelperAction[] = HELPER_ACTIONS.filter((action) => !SERVER_ONLY_HELPER_ACTIONS.includes(action));

/** Дії клієнтів, які є примітивом помічника; решту (сесії, налаштування) виконує сервер. */
function isHelperAction(action: CommandRequest['action']): action is CommandRequest['action'] & HelperAction {
  return (CLIENT_HELPER_ACTIONS as readonly string[]).includes(action);
}
