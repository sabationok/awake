import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import type { NearbyDevice, ProximityReport, UiOption } from '@macontrol/contracts';
import { LogsService } from '../../../logs/logs.service';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { SettingsService } from '../../../settings/settings.service';
import { NO_DEVICE, PROXIMITY_MODULE } from '../../constants/proximity-settings';
import { PROXIMITY_RSSI_STEP, PROXIMITY_STALE_MS } from '../../constants/proximity-limits';
import type { ProximityConfig, ProximityState } from '../../types/proximity-state.types';
import { isProximityReport } from './helpers/is-proximity-report';
import { readProximityConfig } from './helpers/read-proximity-config';

/** Назва вибраного пристрою: окремий ключ без опису, щоб у списку було ім'я, навіть коли пристрою не видно. */
const DEVICE_NAME_KEY = 'deviceName';

/**
 * «Поруч»: помічник шле, які Bluetooth-пристрої бачить і з яким сигналом, агент вирішує, коли блокувати.
 * Вибраний пристрій слабший за поріг (або зник) довше за затримку → одна команда `lock`. Наступна — лише після того,
 * як пристрій повернувся в діапазон.
 */
@Injectable()
export class ProximityService {
  /** Змінилось те, що видно на сторінці: стан Bluetooth, набір пристроїв, сигнал (крок 5 dBm), блокування. */
  readonly changed$ = new Subject<void>();
  private readonly _logger = new Logger(ProximityService.name);
  private _report: ProximityReport | null = null;
  private _reportAt = 0;
  private _farSince: number | null = null;
  /** Уже заблокували за цей відхід: чекаємо, поки пристрій повернеться. */
  private _locked = false;
  private _lastLockAt: string | null = null;
  private _signature = '';

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _settings: SettingsService,
    private readonly _logs: LogsService,
  ) {}

  get config(): ProximityConfig {
    return readProximityConfig((key) => this._settings.get(PROXIMITY_MODULE, key));
  }

  get state(): ProximityState {
    const config = this.config;
    const fresh = this._isFresh(Date.now());
    const devices = fresh ? (this._report?.devices ?? []) : [];
    return {
      config,
      bluetooth: fresh ? (this._report?.bluetooth ?? null) : null,
      devices,
      target: this._target(config, devices),
      targetName: this._targetName(config, devices),
      watching: this._isWatching(config, Date.now()),
      farSince: this._farSince === null ? null : new Date(this._farSince).toISOString(),
      lastLockAt: this._lastLockAt,
    };
  }

  /** Варіанти «Пристрій»: що видно зараз (сильніший сигнал вище) і вибраний, навіть якщо його не видно. */
  deviceOptions(): UiOption[] {
    const { device } = this.config;
    const devices = this._isFresh(Date.now()) ? (this._report?.devices ?? []) : [];
    const options = [...devices]
      .sort((a, b) => b.rssi - a.rssi)
      .map((nearby) => ({ value: nearby.id, label: `${nearby.name} · ${Math.round(nearby.rssi)} dBm` }));
    if (device !== NO_DEVICE && !devices.some((nearby) => nearby.id === device)) {
      options.unshift({ value: device, label: `${this._savedName() ?? 'Пристрій'} · не видно` });
    }
    return options;
  }

  update(report: unknown) {
    if (!isProximityReport(report)) {
      this._logger.warn('Некоректний звіт proximity');
      return;
    }
    this._report = report;
    this._reportAt = Date.now();
    const target = this._target(this.config, report.devices);
    if (target && target.name !== this._savedName()) this._settings.set(PROXIMITY_MODULE, DEVICE_NAME_KEY, target.name);
    this.evaluate();
  }

  /** Налаштування змінились: відлік починається заново. */
  reset() {
    this._farSince = null;
    this._locked = false;
    this.evaluate();
  }

  /** Викликається на кожен звіт і щосекунди: рахує, скільки пристрій «далеко», і блокує один раз. */
  evaluate(now = Date.now()) {
    const config = this.config;
    if (!this._isWatching(config, now)) {
      this._farSince = null;
      this._locked = false;
    } else {
      const target = this._target(config, this._report?.devices ?? []);
      const far = target === null || target.rssi < config.range;
      if (!far) {
        this._farSince = null;
        this._locked = false;
      } else {
        this._farSince ??= now;
        if (!this._locked && now - this._farSince >= config.delayMs) this._lock(target, config);
      }
    }
    this._emitIfChanged(config, now);
  }

  private _lock(target: NearbyDevice | null, config: ProximityConfig) {
    this._locked = true;
    this._lastLockAt = new Date().toISOString();
    this._bridge.sendCommand({ action: 'lock' }, 'mac');
    const name = target?.name ?? this._savedName() ?? 'пристрій';
    const why = target ? `сигнал ${Math.round(target.rssi)} dBm слабший за ${config.range}` : 'не видно';
    this._logs.create({ at: this._lastLockAt, text: `Поруч: екран заблоковано — ${name} далеко (${why})` });
  }

  /** Стежимо, лише коли є що й навіщо: увімкнено, вибрано пристрій, Bluetooth працює, звіт свіжий, сесія (якщо так задано). */
  private _isWatching(config: ProximityConfig, now: number): boolean {
    if (!config.enabled || config.device === NO_DEVICE) return false;
    if (!this._isFresh(now) || this._report?.bluetooth !== 'on') return false;
    return config.when === 'always' || this._bridge.state?.active === true;
  }

  private _isFresh(now: number): boolean {
    return this._report !== null && now - this._reportAt <= PROXIMITY_STALE_MS;
  }

  private _target(config: ProximityConfig, devices: NearbyDevice[]): NearbyDevice | null {
    return config.device === NO_DEVICE ? null : (devices.find((device) => device.id === config.device) ?? null);
  }

  private _targetName(config: ProximityConfig, devices: NearbyDevice[]): string | null {
    if (config.device === NO_DEVICE) return null;
    return this._target(config, devices)?.name ?? this._savedName();
  }

  private _savedName(): string | null {
    const name = this._settings.get(PROXIMITY_MODULE, DEVICE_NAME_KEY);
    return typeof name === 'string' ? name : null;
  }

  private _emitIfChanged(config: ProximityConfig, now: number) {
    const devices = this._isFresh(now) ? (this._report?.devices ?? []) : [];
    const target = this._target(config, devices);
    const signature = [
      this._isFresh(now) ? this._report?.bluetooth : 'stale',
      devices.map((device) => device.id).sort().join(','),
      target ? Math.round(target.rssi / PROXIMITY_RSSI_STEP) : 'none',
      this._isWatching(config, now),
      this._farSince !== null,
      this._lastLockAt,
    ].join('|');
    if (signature === this._signature) return;
    this._signature = signature;
    this.changed$.next();
  }
}
