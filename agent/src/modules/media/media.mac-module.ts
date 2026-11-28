import { Injectable } from '@nestjs/common';
import type { UiPage } from '@macontrol/contracts';
import type { MacModule, ModuleContext } from '../types/mac-module';
import { mediaStatus } from './helpers/media-status';
import { buildMediaPage } from './pages/media-page';

/** Модуль «Екран і звук»: гучність, вимкнення звуку і яскравість дисплея. Системні виклики робить Mac-аппка. */
@Injectable()
export class MediaMacModule implements MacModule {
  readonly id = 'media';
  readonly title = 'Екран і звук';
  readonly icon = { symbol: 'speaker.wave.2.fill', tone: 'indigo' } as const;
  readonly permissions: MacModule['permissions'] = [];
  readonly settings = [];

  status(ctx: ModuleContext) {
    return mediaStatus(ctx.mac);
  }

  pages(ctx: ModuleContext): UiPage[] {
    return [buildMediaPage(ctx.mac)];
  }
}
