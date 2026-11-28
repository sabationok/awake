import { Inject, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { UiPage } from '@macontrol/contracts';
import { AGENT_CONFIG, AgentConfig } from '../config/agent-config';
import { ModulesService } from '../modules/modules.service';
import type { MacModule, ModuleContext } from '../modules/types/mac-module';
import { PERMISSIONS_MODULE } from './constants/permissions';
import { MacPermissionsService } from './mac-permissions.service';
import { buildPermissionsPage } from './pages/permissions-page';

/** Модуль «Дозволи»: сторінка з системними дозволами (лише стан) і перемикачами для кожного модуля. */
@Injectable()
export class PermissionsMacModule implements MacModule {
  readonly id = PERMISSIONS_MODULE;
  readonly title = 'Дозволи';
  readonly description = 'Що macOS дозволила серверу і що з цього лишено кожному модулю.';
  readonly icon = { symbol: 'lock.fill', tone: 'accent' } as const;
  readonly permissions: MacModule['permissions'] = [];
  readonly settings: MacModule['settings'] = [];

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _permissions: MacPermissionsService,
    private readonly _moduleRef: ModuleRef,
  ) {}

  /** Зі старим транспортом (сервер — підпроцес аппки) дозволами володіє аппка. */
  disabled(): string | null {
    return this._config.standalone ? null : 'Працює лише коли сервер запущений сам';
  }

  pages(ctx: ModuleContext): UiPage[] {
    // ModulesService сам отримує цей модуль у списку, тож беремо його при потребі, а не в конструкторі.
    const modules = this._moduleRef.get(ModulesService, { strict: false }).list();
    return [buildPermissionsPage(this._permissions.snapshot(), this._permissions.privacyAccess(), modules, ctx.mac?.active ?? false)];
  }
}
