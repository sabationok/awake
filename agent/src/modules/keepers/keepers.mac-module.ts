import { Injectable } from '@nestjs/common';
import type { UiPage } from '@awake/contracts';
import type { MacModule, ModuleContext, StatusFields } from '../types/mac-module';
import { KEEPERS_MODULE } from './constants/keepers';
import { keepersSummary } from './helpers/keepers-summary';
import { KeepersService } from './keepers.service';
import { buildKeepersPage } from './pages/keepers-page';

/**
 * Модуль «Keepers»: спільний стан «чи є хоч якась сесія». Показує, хто зараз не дає Mac заснути: Awake, Sleeper
 * (як наші сесії) і сторонні процеси з утримань macOS (Claude, браузер з відео). Сторонніми не керує.
 */
@Injectable()
export class KeepersMacModule implements MacModule {
  readonly id = KEEPERS_MODULE;
  readonly title = 'Keepers';
  readonly description = 'Хто зараз тримає Mac без сну: сесії MaControl і сторонні програми (Claude, браузер з відео). Лише показує.';
  readonly icon = { symbol: 'hand.raised.fill', tone: 'orange' } as const;
  // `pmset -g assertions` читається без прав.
  readonly permissions: MacModule['permissions'] = [];
  readonly settings: MacModule['settings'] = [];

  constructor(private readonly _keepers: KeepersService) {}

  /** /status → `keepers`: чи Mac хтось тримає, хто саме і чи стоїть Sleeper. */
  status(ctx: ModuleContext): StatusFields {
    const names = keepersSummary(ctx.mac, this._keepers.keepers());
    return { held: names.length > 0, by: names.length > 0 ? names.join(', ') : null, sleeper: Boolean(ctx.mac?.sleepAt) };
  }

  pages(ctx: ModuleContext): UiPage[] {
    return [buildKeepersPage(ctx.mac, this._keepers.keepers())];
  }
}
