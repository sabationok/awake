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
  UiTree,
  CommandRequest,
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
import { writeProtocolLine } from './protocol-stdout';

type SessionMessage = Extract<MacToAgentMessage, { type: 'session' }>['data'];
type LogMessage = Extract<MacToAgentMessage, { type: 'log' }>['data'];
type DevicesRequest = Extract<MacToAgentMessage, { type: 'devices' }>['data'];
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

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _helper: MacHelperService,
  ) {}

  onModuleInit() {
    if (this._config.standalone) {
      this._helper.state$.subscribe((state) => {
        if (!state) return;
        this._stateAt = Date.now();
        this.state$.next(toMacState(state));
      });
      this._helper.start();
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
    if (this._config.standalone) this._runOnHelper(command);
    else this._send({ type: 'command', data: { ...command, id, source } });
    return id;
  }

  sendTree(tree: UiTree) {
    this._send({ type: 'tree', data: tree });
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

  sendSecrets(snapshot: SecretsSnapshot) {
    this._send({ type: 'secrets', data: snapshot });
  }

  private _send(message: AgentToMacMessage) {
    // Без аппки stdout нікому читати: дерево й знімки клієнти беруть через HTTP.
    if (this._config.standalone) return;
    writeProtocolLine(message);
  }

  /** Системні дії виконує помічник. Сесії й налаштування аппки без аппки ще не працюють: пишемо це в журнал. */
  private _runOnHelper(command: CommandRequest) {
    if (!isHelperAction(command.action)) {
      const text = `Без аппки дія «${command.action}» ще не працює: сесії й налаштування поки виконує аппка`;
      this._logger.warn(text);
      this.logs$.next({ at: new Date().toISOString(), text });
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

  private _handleLine(line: string) {
    if (!line.trim()) return;
    let message: MacToAgentMessage;
    try {
      message = JSON.parse(line) as MacToAgentMessage;
    } catch {
      this._logger.warn(`bad line from Mac: ${line.slice(0, 200)}`);
      return;
    }
    switch (message.type) {
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

function isHelperAction(action: CommandRequest['action']): action is HelperAction {
  return (HELPER_ACTIONS as readonly string[]).includes(action);
}

/** Системний стан від помічника плюс порожні поля сесій: без аппки сесій ще немає. */
function toMacState(state: HelperState): MacState {
  return {
    ...state,
    active: false,
    until: null,
    startedAt: null,
    duration: null,
    appVersion: 'без аппки',
    sleepStartedAt: null,
    sleepAt: null,
  };
}
