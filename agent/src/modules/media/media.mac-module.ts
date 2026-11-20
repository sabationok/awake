import { Injectable } from '@nestjs/common';
import type { UiPage } from '@awake/contracts';
import type { MacModule, ModuleContext } from '../types/mac-module';
import { MEDIA_BOT, mediaStatus } from './bot/media-bot';
import { parsePercent } from './helpers/parse-percent';
import { buildMediaPage } from './pages/media-page';

/** Модуль «Екран і звук»: гучність, вимкнення звуку і яскравість дисплея. Системні виклики робить Mac-аппка. */
@Injectable()
export class MediaMacModule implements MacModule {
  readonly id = 'media';
  readonly title = 'Екран і звук';
  readonly icon = { symbol: 'speaker.wave.2.fill', tone: 'indigo' } as const;
  readonly permissions: MacModule['permissions'] = [];
  readonly settings = [];
  readonly bot = MEDIA_BOT;

  status(ctx: ModuleContext) {
    return mediaStatus(ctx.mac);
  }

  readonly actions: MacModule['actions'] = {
    volume: (params, ctx, source) => {
      const value = parsePercent(params.value);
      if (value !== null) ctx.sendToMac({ action: 'volume', value }, source);
    },
    brightness: (params, ctx, source) => {
      const value = parsePercent(params.value);
      if (value !== null) ctx.sendToMac({ action: 'brightness', value }, source);
    },
    /** Без `value` (команда бота) перемикає поточний стан. */
    mute: (params, ctx, source) => {
      const value = params.value === undefined ? !ctx.mac?.muted : params.value === true || params.value === 'true';
      ctx.sendToMac({ action: 'mute', value }, source);
    },
  };

  pages(ctx: ModuleContext): UiPage[] {
    return [buildMediaPage(ctx.mac)];
  }
}
