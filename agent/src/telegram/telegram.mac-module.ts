import { Injectable } from '@nestjs/common';
import type { SettingDefinition, UiPage } from '@awake/contracts';
import type { MacModule } from '../modules/types/mac-module';

/** Модуль Telegram у MacCC: лише перемикач бота, без сторінок і дій. */
@Injectable()
export class TelegramMacModule implements MacModule {
  readonly id = 'telegram';
  readonly title = 'Telegram';
  readonly icon = { symbol: 'paperplane.fill', tone: 'accent' } as const;
  readonly settings: SettingDefinition[] = [
    {
      type: 'switch',
      key: 'bot',
      label: 'Бот у MacCC',
      hint: 'Команди й кнопки в Telegram. Вимкни бота у старій аппці, інакше два боти конфліктують',
      default: false,
    },
  ];

  pages(): UiPage[] {
    return [];
  }

  readonly actions: MacModule['actions'] = {};
}
