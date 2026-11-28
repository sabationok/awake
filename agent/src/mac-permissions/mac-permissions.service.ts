import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { distinctUntilChanged, map, Subject, type Subscription } from 'rxjs';
import type { MacPermission, PermissionsSnapshot, PrivacyAccess, PrivacyAccessKind } from '@macontrol/contracts';
import { AGENT_CONFIG, AgentConfig } from '../config/agent-config';
import { PERMISSION_INFO } from './constants/permissions';
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
 * окремим модулям, зберігає сервер у своїй базі. Клієнти бачать їх на сторінці «Дозволи» від сервера і шлють
 * лише натискання (дії модуля `permissions`). Перевірка перед дією — `allowed()`.
 */
@Injectable()
export class MacPermissionsService implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(MacPermissionsService.name);
  /** Знімок змінився: індекс і сторінки треба перебудувати. */
  readonly changed$ = new Subject<void>();
  private readonly _subscriptions: Subscription[] = [];
  private _denied: Denied = [];
  private _granted: string[] = [];
  /** Дозволи macOS помічника; null — помічник ще не сказав (або це помічник 0.1.0). */
  private _access: Record<PrivacyAccessKind, PrivacyAccess> | null = null;

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
      this._helper.state$
        .pipe(
          map((state) => state?.access ?? null),
          distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        )
        .subscribe((access) => {
          if (!access) return;
          this._access = access;
          this.changed$.next();
        }),
    );
    this._publish();
  }

  onModuleDestroy() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  snapshot(): PermissionsSnapshot {
    return { granted: this._granted, denied: this._denied };
  }

  /** Дозволи macOS помічника (геолокація, Bluetooth) для сторінки «Дозволи». */
  privacyAccess(): Record<PrivacyAccessKind, PrivacyAccess> | null {
    return this._access;
  }

  /**
   * Кнопка «Надати…»: помічник показує системне вікно macOS (або відкриває налаштування після відмови).
   * Інших шляхів до запиту немає: ні старт, ні збірка, ні сканування його не показують.
   */
  async requestAccess(kind: PrivacyAccessKind) {
    const result = await this._helper.run('requestAccess', undefined, kind);
    if (!result.ok) this._log(`Запит дозволу «${kind}» не вдався: ${result.error ?? 'помічник не відповів'}`);
  }

  /** Дозвіл видано в системі і власник не вимкнув його цьому модулю. */
  allowed(module: string, permission: string): boolean {
    return this._granted.includes(permission) && !this._isDenied(module, permission);
  }

  /** Чому модуль не може користуватись дозволом, словами для його сторінки; null — може. */
  missing(module: string, permission: MacPermission): string | null {
    // Зі старим транспортом дозволи перевіряє аппка.
    if (!this._config.standalone) return null;
    const title = PERMISSION_INFO[permission].title;
    if (!this._granted.includes(permission)) return `Дозвіл «${title}» не видано в системі. Видати його можна лише в аппці на Mac, на сторінці «Дозволи».`;
    if (this._isDenied(module, permission)) return `Дозвіл «${title}» вимкнено для цього модуля на сторінці «Дозволи».`;
    return null;
  }

  /** Перемикач «Дозволено модулю». */
  setModule(module: string, permission: string, allowed: boolean) {
    const rest = this._denied.filter((entry) => !(entry.module === module && entry.permission === permission));
    this._denied = allowed ? rest : [...rest, { module, permission }];
    this._settings.set(STORE, DENIED_KEY, JSON.stringify(this._denied));
    this._log(`Дозвіл «${permission}» для модуля ${module}: ${allowed ? 'дозволено' : 'вимкнено'}`);
    this._publish();
  }

  /** Видати або відкликати дозвіл у системі: помічник показує вікно пароля macOS на екрані Mac. */
  async change(action: 'grant' | 'revoke', permission: string) {
    // Сесія Awake тримає сон вимкненим цим самим правилом: без нього сон уже не повернути.
    if (action === 'revoke' && permission === 'sleepControl' && this._bridge.state?.active) {
      this._log('Дозвіл «sleepControl» не відкликано: іде сесія Awake');
      return;
    }
    const result = await this._helper.run(action === 'grant' ? 'permissionGrant' : 'permissionRevoke', undefined, permission, PROMPT_TIMEOUT_MS);
    if (result.ok) this._log(`Дозвіл «${permission}» ${action === 'grant' ? 'надано' : 'відкликано'}`);
    else this._log(result.error === 'cancelled' ? 'Скасовано' : `Помилка: ${result.error ?? 'помічник не відповів'}`);
  }

  private _publish() {
    // Знімок окремим рядком потрібен меню-бару аппки; сторінку «Дозволи» клієнти отримують як звичайну сторінку.
    this._bridge.sendPermissions(this.snapshot());
    this.changed$.next();
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
