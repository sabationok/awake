import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subject, merge, type Subscription } from 'rxjs';
import type { AppState, GrantState, MacPermission, MacState, StateFull, StatePatch, SudoersState, SettingValue, UiScope } from '@macontrol/contracts';
import { MacBridgeService } from '../../mac-bridge/services/mac-bridge.service';
import { MacPermissionsService } from '../../mac-permissions/mac-permissions.service';
import { ModulesService } from '../../modules/modules.service';
import { diffState } from '../helpers/diff-state';
import { filterStateAt, type SettingScopeOf } from '../helpers/state-scope';

const MAC_PERMISSIONS: readonly MacPermission[] = ['sleepControl', 'thermalRead'];
/**
 * Після кінця сесії помічник ще секунду-дві звітує старий `sleepBlocked`: «сон вимкнено поза сесією» рахуємо лише
 * після цієї паузи, щоб рядок «Повернути сон» не блимав на кожному «Стоп».
 */
const SLEEP_OUTSIDE_GRACE_MS = 5_000;

/**
 * AppState — єдиний власник (скіл `sdui` «State, bind, show»): збирає стейт із моста Mac (сесії, система),
 * дозволів і налаштувань модулів, рахує різницю з попереднім і шле її патчем з `rev` +1. Канали (Mac socket,
 * локальний web) беруть звідси повний стейт і патчі, відфільтровані під свій scope. Клієнти нічого не пишуть.
 */
@Injectable()
export class AppStateService implements OnModuleInit, OnModuleDestroy {
  /** Патч з усіма гілками; канал фільтрує його `patchFor`. */
  readonly patches$ = new Subject<StatePatch>();
  private readonly _subscriptions: Subscription[] = [];
  private _state: AppState;
  private _rev = 1;
  /** Коли востаннє бачили сесію Awake (для SLEEP_OUTSIDE_GRACE_MS). */
  private _awakeSeenAt = 0;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _modules: ModulesService,
    private readonly _permissions: MacPermissionsService,
  ) {
    this._state = this._build();
  }

  onModuleInit() {
    this._subscriptions.push(
      merge(this._bridge.state$, this._modules.settingChanged$, this._permissions.changed$).subscribe(() => this.refresh()),
    );
  }

  onModuleDestroy() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  get rev(): number {
    return this._rev;
  }

  /** Повний стейт для `scope`. */
  full(scope: UiScope): StateFull {
    return { rev: this._rev, state: filterStateAt('', this._state, scope, this._settingScope) as AppState };
  }

  /** Той самий патч для `scope`: операції чужих гілок відкинуто, `rev` той самий (порожній патч теж іде — без пропуску). */
  patchFor(patch: StatePatch, scope: UiScope): StatePatch {
    const ops = patch.ops.flatMap((op) => {
      const value = filterStateAt(op.path, op.value, scope, this._settingScope);
      return value === undefined ? [] : [{ path: op.path, value }];
    });
    return { rev: patch.rev, ops };
  }

  /** Перезбирає стейт; є різниця — `rev` +1 і патч. */
  refresh() {
    const next = this._build();
    const ops = diffState(this._state, next);
    if (ops.length === 0) return;
    this._state = next;
    this._rev += 1;
    this.patches$.next({ rev: this._rev, ops });
  }

  /** Визначення знайдено без scope — 'all'; не знайдено — null (фільтр сховає гілку). */
  private readonly _settingScope: SettingScopeOf = (module, key) => {
    const definition = this._modules.list().find((item) => item.id === module)?.settings.find((d) => d.key === key);
    return definition ? (definition.scope ?? 'all') : null;
  };

  private _build(): AppState {
    const mac = this._bridge.state;
    const now = Date.now();
    if (mac?.active) this._awakeSeenAt = now;
    const settled = now - this._awakeSeenAt > SLEEP_OUTSIDE_GRACE_MS;
    return {
      permissions: this._permissionsState(),
      sessions: {
        awake: mac?.active ? { startedAt: mac.startedAt ?? '', until: mac.until } : null,
        sleeper: mac?.sleepAt ? { startedAt: mac.sleepStartedAt ?? mac.sleepAt, sleepAt: mac.sleepAt } : null,
      },
      system: systemState(mac, settled),
      modules: this._modulesState(),
    };
  }

  private _permissionsState(): AppState['permissions'] {
    const granted = this._permissions.snapshot().granted;
    const access = this._permissions.privacyAccess();
    const system = Object.fromEntries(
      MAC_PERMISSIONS.map((permission): [MacPermission, SudoersState] => [permission, granted.includes(permission) ? 'granted' : 'missing']),
    ) as Record<MacPermission, SudoersState>;
    const grant = (value: string | undefined): GrantState => (value as GrantState | undefined) ?? 'notDetermined';
    return { location: grant(access?.location), bluetooth: grant(access?.bluetooth), system };
  }

  private _modulesState(): AppState['modules'] {
    const modules: Record<string, Record<string, SettingValue>> = {};
    for (const [fullKey, value] of Object.entries(this._modules.settingsSnapshot())) {
      const dot = fullKey.indexOf('.');
      const module = fullKey.slice(0, dot);
      (modules[module] ??= {})[fullKey.slice(dot + 1)] = value;
    }
    return modules;
  }
}

/** `settled` — сесія Awake скінчилась давніше за SLEEP_OUTSIDE_GRACE_MS (або її не було). */
function systemState(mac: MacState | null, settled: boolean): AppState['system'] {
  return {
    battery: mac?.battery ?? null,
    power: mac?.power ?? 'unknown',
    thermal: mac?.thermal ?? 'nominal',
    lidClosed: mac?.lidClosed ?? false,
    ssid: mac?.ssid ?? null,
    volume: mac?.volume ?? null,
    muted: mac?.muted ?? false,
    brightness: mac?.brightness ?? null,
    sleepBlocked: mac?.sleepBlocked ?? false,
    sleepBlockedOutside: Boolean(mac?.sleepBlocked && !mac.active && settled),
  };
}
