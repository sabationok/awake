import { Injectable } from '@nestjs/common';
import { BehaviorSubject } from 'rxjs';
import type { TelegramRunState } from '../types/telegram-run-state.types';

/**
 * Стан polling-у Telegram без залежностей: пише TelegramBotService, читає модуль Telegram у MaControl.
 * Окремо від сервісу бота, щоб реєстр модулів не залежав від Telegraf.
 */
@Injectable()
export class TelegramStateService {
  readonly state$ = new BehaviorSubject<TelegramRunState>({ running: false, since: null });

  get state(): TelegramRunState {
    return this.state$.value;
  }

  setRunning(running: boolean) {
    if (this.state$.value.running === running) return;
    this.state$.next({ running, since: new Date().toISOString() });
  }
}
