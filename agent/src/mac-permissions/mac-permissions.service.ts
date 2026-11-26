import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { distinctUntilChanged, map, type Subscription } from 'rxjs';
import type { PermissionClick, PermissionsSnapshot } from '@awake/contracts';
import { AGENT_CONFIG, AgentConfig } from '../config/agent-config';
import { MacBridgeService } from '../mac-bridge/services/mac-bridge.service';
import { MacHelperService } from '../mac-helper/mac-helper.service';
import { SettingsService } from '../settings/settings.service';

const STORE = 'mac-permissions';
const DENIED_KEY = 'denied';
/** Вікно пароля macOS чекає на власника: відповідь помічника може прийти нескоро. */
const PROMPT_TIMEOUT_MS = 180_000;

type Denied = PermissionsSnapshot['denied'];

/**
 * Дозволи належать серверу (режим standalone). Чи видано дозвіл у системі, перевіряє помічник; що вимкнено
 * окремим модулям, зберігає сервер у своїй базі. Клієнти (аппка, веб) отримують знімок при кожній зміні
 * і шлють лише натискання. Перевірка перед дією — `allowed()`.
 */
@Injectable()
export class MacPermissionsService implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(MacPermissionsService.name);
  private readonly _subscriptions: Subscription[] = [];
  private _denied: Denied = [];
  private _granted: string[] = [];

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _bridge: MacBridgeService,
    private readonly _helper: MacHelperService,
    private readonly _settings: SettingsService,
  ) {}

  onModuleInit() {
    if (!this._config.standalone) return;
    this._denied = this._loadDenied();
    this._subscriptions.push(
      this._helper.state$
        .pipe(
          map((state) => state?.granted ?? null),
          distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        )
        .subscribe((granted) => {
          // Помічник мовчить: останній відомий стан лишається, а не скидається в «нічого не видано».
          if (!granted) return;
          this._granted = granted;
          this._publish();
        }),
      this._bridge.permissionClicks$.subscribe((click) => void this._apply(click)),
    );
    this._publish();
  }

  onModuleDestroy() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  snapshot(): PermissionsSnapshot {
    return { granted: this._granted, denied: this._denied };
  }

  /** Дозвіл видано в системі і власник не вимкнув його цьому модулю. */
  allowed(module: string, permission: string): boolean {
    return this._granted.includes(permission) && !this._isDenied(module, permission);
  }

  private async _apply(click: PermissionClick) {
    if (click.action === 'setModule') {
      const rest = this._denied.filter((entry) => !(entry.module === click.module && entry.permission === click.permission));
      this._denied = click.allowed ? rest : [...rest, { module: click.module, permission: click.permission }];
      this._settings.set(STORE, DENIED_KEY, JSON.stringify(this._denied));
      this._log(`Дозвіл «${click.permission}» для модуля ${click.module}: ${click.allowed ? 'дозволено' : 'вимкнено'}`);
      this._publish();
      return;
    }
    // Сесія Awake тримає сон вимкненим цим самим правилом: без нього сон уже не повернути.
    if (click.action === 'revoke' && click.permission === 'sleepControl' && this._bridge.state?.active) {
      this._log('Дозвіл «sleepControl» не відкликано: іде сесія Awake');
      return;
    }
    const action = click.action === 'grant' ? 'permissionGrant' : 'permissionRevoke';
    const result = await this._helper.run(action, undefined, click.permission, PROMPT_TIMEOUT_MS);
    const verb = click.action === 'grant' ? 'надано' : 'відкликано';
    if (result.ok) this._log(`Дозвіл «${click.permission}» ${verb}`);
    else this._log(result.error === 'cancelled' ? 'Скасовано' : `Помилка: ${result.error ?? 'помічник не відповів'}`);
  }

  private _publish() {
    this._bridge.sendPermissions(this.snapshot());
  }

  private _isDenied(module: string, permission: string): boolean {
    return this._denied.some((entry) => entry.module === module && entry.permission === permission);
  }

  private _log(text: string) {
    this._logger.log(text);
    this._bridge.logs$.next({ at: new Date().toISOString(), text });
  }

  private _loadDenied(): Denied {
    const raw = this._settings.get(STORE, DENIED_KEY);
    if (typeof raw !== 'string' || !raw) return [];
    try {
      return JSON.parse(raw) as Denied;
    } catch {
      return [];
    }
  }
}
