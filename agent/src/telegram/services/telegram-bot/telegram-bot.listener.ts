import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { filter, type Subscription } from 'rxjs';
import { ModulesService } from '../../../modules/modules.service';
import { TelegramBotService } from './telegram-bot.service';

/** Запускає й зупиняє бота за налаштуванням telegram.bot. */
@Injectable()
export class TelegramBotListener implements OnModuleInit, OnModuleDestroy {
  private _subscription: Subscription | null = null;

  constructor(
    private readonly _modules: ModulesService,
    private readonly _bot: TelegramBotService,
  ) {}

  onModuleInit() {
    if (this._modules.context('telegram').setting<boolean>('bot')) this._bot.start();
    this._subscription = this._modules.settingChanged$
      .pipe(filter((change) => change.module === 'telegram' && change.key === 'bot'))
      .subscribe((change) => (change.value === true ? this._bot.start() : this._bot.stop()));
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
    this._bot.stop();
  }
}
