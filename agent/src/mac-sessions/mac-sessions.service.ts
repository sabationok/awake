import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { interval, type Subscription } from 'rxjs';
import type { HelperState, SessionSource, SettingValue } from '@awake/contracts';
import { formatHhmm } from '../common/format-hhmm';
import { AGENT_CONFIG, AgentConfig } from '../config/agent-config';
import { MacBridgeService, type ServerCommand } from '../mac-bridge/services/mac-bridge.service';
import { MacHelperService } from '../mac-helper/mac-helper.service';
import { MacPermissionsService } from '../mac-permissions/mac-permissions.service';
import { ModulesService } from '../modules/modules.service';
import { SettingsService } from '../settings/settings.service';
import { TelegramNotificationsService } from '../telegram/notifications';
import {
  AWAKE_DEFAULT_DURATION,
  AWAKE_SESSION_KEY,
  BATTERY_STOP_DEFAULT,
  BATTERY_WARN_DEFAULT,
  MAC_SESSIONS_STORE,
  SESSION_TICK_MS,
  SLEEPER_SESSION_KEY,
  SLEEP_DELAY_MS,
  STOP_REASON,
} from './constants/mac-sessions';
import { durationSeconds } from './helpers/duration-seconds';
import type { AwakeSession, SleeperSession } from './types/mac-session.types';

/** Сесія скрипта `awake` з термінала: її сон сервер не чіпає. */
const SCRIPT_PID_FILE = join(homedir(), '.config/awake/session.pid');

/**
 * Сесії Awake і Sleeper на сервері (лише режим standalone; зі старим транспортом їх веде аппка).
 * Сервер вирішує все: коли почати, коли закінчити, що одна сесія закриває іншу, коли попередити про батарею.
 * Помічник лише виконує примітиви: вимкнути сон, заснути, заблокувати, погасити екран.
 * Назовні сесії йдуть тими самими потоками моста, що й від аппки: стан, `sessions$`, `sleepTimers$`, `logs$`.
 */
@Injectable()
export class MacSessionsService implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(MacSessionsService.name);
  private readonly _subscriptions: Subscription[] = [];
  private _awake: AwakeSession | null = null;
  private _sleeper: SleeperSession | null = null;
  /** Попередній стан помічника: за ним видно переходи (живлення, кришка, нагрів). */
  private _last: HelperState | null = null;
  private _batteryWarned = false;
  /** Екран уже гасили в цей період бездіяльності. */
  private _dimmed = false;
  private _restored = false;

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _bridge: MacBridgeService,
    private readonly _helper: MacHelperService,
    private readonly _settings: SettingsService,
    private readonly _permissions: MacPermissionsService,
    private readonly _modules: ModulesService,
    private readonly _notifications: TelegramNotificationsService,
  ) {}

  onModuleInit() {
    if (!this._config.standalone) return;
    this._awake = this._load<AwakeSession>(AWAKE_SESSION_KEY);
    this._sleeper = this._load<SleeperSession>(SLEEPER_SESSION_KEY);
    this._publish();
    this._subscriptions.push(
      this._bridge.serverCommands$.subscribe((request) => void this._handle(request)),
      this._helper.state$.subscribe((state) => void this._onState(state)),
      interval(SESSION_TICK_MS).subscribe(() => void this._tick()),
    );
  }

  onModuleDestroy() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  // MARK: команди

  private async _handle({ command, source }: ServerCommand) {
    switch (command.action) {
      case 'start':
        return this._startAwake(command.duration ?? this._awakeSetting<string>('duration') ?? AWAKE_DEFAULT_DURATION, source);
      case 'stop':
        return this._stopAwake(STOP_REASON.manual, source);
      case 'sleepTimer':
        return this._startSleeper(typeof command.value === 'number' ? command.value : 0, source);
      case 'setting':
        // Налаштування сервер читає в себе; дією є лише аварійне повернення сну.
        if (command.key === 'awake.restoreSleep') await this._restoreSleep('вручну');
        return;
    }
  }

  // MARK: Awake

  private async _startAwake(duration: string, source: SessionSource) {
    const seconds = durationSeconds(duration);
    if (seconds === null) return this._log(`Awake: незрозуміла тривалість «${duration}»`);
    if (!this._permissions.allowed('awake', 'sleepControl')) return this._log('Керування сном вимкнено для модуля Awake або не видано дозвіл');
    // Одна сесія за раз: Awake закриває Sleeper.
    this._endSleeper(STOP_REASON.awake, source, false);
    const now = new Date();
    const previous = this._awake;
    if (!previous) {
      const result = await this._helper.run('sleepDisabled', true);
      if (!result.ok) return this._log(`Awake не запущено: ${this._sleepError(result.error)}`);
    }
    const session: AwakeSession = {
      startedAt: now.toISOString(),
      until: new Date(now.getTime() + seconds * 1000).toISOString(),
      duration,
      source,
    };
    this._awake = session;
    this._batteryWarned = false;
    this._save(AWAKE_SESSION_KEY, session);
    const battery = this._last?.battery ?? null;
    const fields = { until: formatHhmm(session.until) ?? '—', duration, ...this._powerFields() };
    // Сесія вже йшла: новий час рахується з нуля, сон не вмикається й не вимикається.
    const event = previous ? 'restart' : 'start';
    const title = previous ? '🔁 Сесію перезапущено' : '☕️ Сон заблоковано';
    this._log(`${title} (${fieldsText({ event, ...fields })})`);
    this._bridge.sessions$.next({ event, at: session.startedAt, source, duration, battery });
    this._notifications.notify({ source: 'awake', type: 'start', title, fields });
    this._publish();
  }

  private async _stopAwake(reason: string, source: SessionSource) {
    const session = this._awake;
    if (!session) return;
    this._awake = null;
    this._save(AWAKE_SESSION_KEY, null);
    const result = await this._helper.run('sleepDisabled', false);
    if (!result.ok) this._log(`Сон не повернуто: ${this._sleepError(result.error)}`);
    const title = '😴 Сон повернуто';
    const fields = { reason, ...this._powerFields() };
    this._log(`${title} (${fieldsText({ event: 'stop', ...fields })})`);
    this._bridge.sessions$.next({ event: 'stop', at: new Date().toISOString(), source, battery: this._last?.battery ?? null, reason });
    this._notifications.notify({ source: 'awake', type: 'stop', title, fields });
    this._publish();
  }

  /** Сон лишився вимкненим без сесії (збій, вимкнення живлення) або власник натиснув «Повернути сон». */
  private async _restoreSleep(reason: string) {
    if (this._awake) return this._stopAwake(reason, 'mac');
    const result = await this._helper.run('sleepDisabled', false);
    this._log(result.ok ? `🛌 Сон повернуто (${fieldsText({ event: 'off', reason })})` : `Сон не повернуто: ${this._sleepError(result.error)}`);
  }

  // MARK: Sleeper

  private async _startSleeper(minutes: number, source: SessionSource) {
    if (minutes <= 0) return this._endSleeper(STOP_REASON.cancelled, source, false);
    this._endSleeper(STOP_REASON.restart, source, true);
    // Сесія Awake тримає сон вимкненим, тож її спершу закриваємо.
    await this._stopAwake(STOP_REASON.sleeper, source);
    const now = new Date();
    const session: SleeperSession = {
      startedAt: now.toISOString(),
      sleepAt: new Date(now.getTime() + minutes * 60_000).toISOString(),
      minutes,
      source,
    };
    this._sleeper = session;
    this._save(SLEEPER_SESSION_KEY, session);
    const until = formatHhmm(session.sleepAt) ?? '—';
    this._log(`🌙 Sleeper: засне о ${until} (${fieldsText({ event: 'sleep.start', until, minutes })})`);
    this._emitSleeper('start', session, source, null, false);
    this._publish();
  }

  /** `silent` — в історію, але без Telegram (перезапуск таймера). */
  private _endSleeper(reason: string, source: SessionSource, silent: boolean) {
    const session = this._sleeper;
    if (!session) return;
    this._sleeper = null;
    this._save(SLEEPER_SESSION_KEY, null);
    const title = reason === STOP_REASON.asleep ? '💤 Sleeper: засинаю' : '🌙 Sleeper завершено';
    this._log(`${title} (${fieldsText({ event: 'sleep.stop', reason, minutes: session.minutes })})`);
    this._emitSleeper('stop', session, source, reason, silent);
    this._publish();
  }

  private _emitSleeper(event: 'start' | 'stop', session: SleeperSession, source: SessionSource, reason: string | null, silent: boolean) {
    this._bridge.sleepTimers$.next({
      event,
      at: new Date().toISOString(),
      startedAt: session.startedAt,
      sleepAt: session.sleepAt,
      minutes: session.minutes,
      source,
      reason,
      silent,
    });
  }

  // MARK: час і стан Mac

  private async _tick() {
    const now = Date.now();
    if (this._awake && now >= Date.parse(this._awake.until)) await this._stopAwake(STOP_REASON.timer, 'mac');
    if (this._sleeper && now >= Date.parse(this._sleeper.sleepAt)) {
      this._endSleeper(STOP_REASON.asleep, 'mac', false);
      // Сон лишився вимкненим після збою: без цього «заснути зараз» нічого не зробить.
      if (this._last?.sleepBlocked) await this._restoreSleep('Sleeper');
      setTimeout(() => void this._helper.run('sleepNow'), SLEEP_DELAY_MS);
    }
  }

  private async _onState(state: HelperState | null) {
    if (!state) return;
    const last = this._last;
    this._last = state;
    if (!this._restored) {
      this._restored = true;
      await this._restoreAfterRestart(state);
    }
    if (!this._awake || !last) return;
    if (state.power !== last.power && state.power !== 'unknown' && last.power !== 'unknown') {
      const title = state.power === 'BAT' ? '🔌 Живлення відключено' : '🔌 Живлення підключено';
      this._say('system', 'power', title, { power: state.power, battery: state.battery ?? '?' });
    }
    await this._checkBattery(state);
    if (!this._awake) return;
    if (state.thermal !== last.thermal) await this._onThermal(state.thermal);
    if (!this._awake) return;
    // Mac не засне і сам не заблокується, тож закриту кришку блокує сервер.
    if (state.lidClosed && !last.lidClosed && this._awakeSetting<boolean>('lockOnLidClose') !== false) {
      const result = await this._helper.run('lock');
      this._log(result.ok ? 'Кришку закрито: екран заблоковано' : 'Кришку закрито: екран погашено, блокування недоступне');
    }
    this._dim(state);
  }

  private async _checkBattery(state: HelperState) {
    if (state.power !== 'BAT' || state.battery === null) {
      this._batteryWarned = false;
      return;
    }
    const stopAt = this._percent(this._awakeSetting('batteryStop'), BATTERY_STOP_DEFAULT);
    if (state.battery <= stopAt) return this._stopAwake(`батарея ${state.battery}%, зупиняю щоб Mac міг заснути`, 'mac');
    const warnAt = this._percent(this._modules.context('system').setting('batteryWarn'), BATTERY_WARN_DEFAULT);
    if (state.battery <= warnAt && !this._batteryWarned) {
      this._batteryWarned = true;
      this._say('system', 'batteryLow', '🪫 Низький заряд', { battery: state.battery, stop_at: stopAt });
    }
  }

  private async _onThermal(thermal: HelperState['thermal']) {
    switch (thermal) {
      case 'critical':
        return this._stopAwake('критичний перегрів', 'mac');
      case 'serious':
        return this._say('system', 'thermal', '🔥 Сильний перегрів', { thermal, hint: 'відкрий кришку або дай охолонути' });
      case 'fair':
        return this._say('system', 'thermal', '🌡 Помірне нагрівання', { thermal });
      case 'nominal':
        return this._say('system', 'thermal', '✅ Температура в нормі', { thermal });
    }
  }

  /** «Гасити екран під час сесії»: один раз за кожен період бездіяльності. −1 — як у системі. */
  private _dim(state: HelperState) {
    const limit = Number(this._awakeSetting('displayOff') ?? -1);
    if (!(limit > 0)) return;
    if (state.idleSeconds < 2) this._dimmed = false;
    if (this._dimmed || state.idleSeconds < limit) return;
    this._dimmed = true;
    void this._helper.run('displayOff');
  }

  /** Перший стан після старту сервера: звіряємо збережені сесії з тим, що є на Mac насправді. */
  private async _restoreAfterRestart(state: HelperState) {
    const now = Date.now();
    if (this._sleeper && now >= Date.parse(this._sleeper.sleepAt)) {
      // Присипляти Mac одразу після запуску сервера несподівано: сесію лише закриваємо.
      this._endSleeper(STOP_REASON.interrupted, 'mac', true);
    }
    if (this._awake) {
      // Сон могли повернути, поки сервер не працював: сесія триває, тож вимикаємо його знову.
      if (now < Date.parse(this._awake.until) && !state.sleepBlocked) {
        const result = await this._helper.run('sleepDisabled', true);
        if (!result.ok) await this._stopAwake(`${STOP_REASON.interrupted}: ${this._sleepError(result.error)}`, 'mac');
      }
      return;
    }
    if (state.sleepBlocked && !scriptSessionAlive()) await this._restoreSleep('після збою: сон лишився вимкненим без активної сесії');
  }

  // MARK: допоміжне

  private _publish() {
    this._bridge.setSessionFields({
      active: this._awake !== null,
      until: this._awake?.until ?? null,
      startedAt: this._awake?.startedAt ?? null,
      duration: this._awake?.duration ?? null,
      sleepStartedAt: this._sleeper?.startedAt ?? null,
      sleepAt: this._sleeper?.sleepAt ?? null,
    });
  }

  private _say(source: string, type: string, title: string, fields: Record<string, string | number>) {
    this._log(`${title} (${fieldsText({ event: type, ...fields })})`);
    this._notifications.notify({ source, type, title, fields });
  }

  private _log(text: string) {
    this._logger.log(text);
    this._bridge.logs$.next({ at: new Date().toISOString(), text });
  }

  private _powerFields(): Record<string, string | number> {
    return { battery: this._last?.battery ?? '?', power: this._last?.power ?? 'unknown' };
  }

  private _sleepError(error: string | undefined): string {
    return error?.includes('sudoers') ? 'немає правила sudoers для pmset, запусти scripts/install.sh' : (error ?? 'помічник не відповів');
  }

  private _awakeSetting<T extends SettingValue>(key: string): T | undefined {
    return this._modules.context('awake').setting<T>(key);
  }

  private _percent(value: SettingValue | undefined, fallback: number): number {
    const percent = Number(value);
    return Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent : fallback;
  }

  private _load<T>(key: string): T | null {
    const raw = this._settings.get(MAC_SESSIONS_STORE, key);
    if (typeof raw !== 'string' || !raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private _save(key: string, session: AwakeSession | SleeperSession | null) {
    this._settings.set(MAC_SESSIONS_STORE, key, session ? JSON.stringify(session) : '');
  }
}

/** `event=start until=10:00 …` — формат рядка журналу, який уже читають сторінки. */
function fieldsText(fields: Record<string, string | number>): string {
  return Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
}

function scriptSessionAlive(): boolean {
  if (!existsSync(SCRIPT_PID_FILE)) return false;
  const pid = Number(readFileSync(SCRIPT_PID_FILE, 'utf8').trim());
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
