import { Injectable } from '@nestjs/common';
import { TelegramError, type Telegram } from 'telegraf';
import { describeError } from '../helpers/describe-error';
import type { TelegramEnv } from '../types/telegram-env.types';
import type { SendTelegramMessageDto } from './dto/send-telegram-message.dto';
import { toChatId } from './helpers/to-chat-id';

/**
 * Вузький доступ до Bot API запущеного бота для конектора груп. Клієнтом володіє TelegramBotService: він кладе його
 * сюди на старті й забирає на зупинці. Сервіс без залежностей, тож `TelegramGroupProvider` потрапляє в
 * `GROUP_PROVIDERS` без циклу (ядро груп → провайдер → цей сервіс; бот → ядро груп). Токен звідси не виходить:
 * помилки мережі віддаються вже без нього.
 */
@Injectable()
export class TelegramClientService {
  private _api: Telegram | null = null;
  private _env: TelegramEnv | null = null;

  attach(api: Telegram, env: TelegramEnv): void {
    this._api = api;
    this._env = env;
  }

  detach(): void {
    this._api = null;
    this._env = null;
  }

  /** Id власника (він же id його приватного чату) або null, коли бот не запущено. */
  get ownerId(): string | null {
    return this._env?.chatId ?? null;
  }

  /**
   * Виклик Bot API. Бот не запущено — помилка. `TelegramError` (відповідь API, токена в ній немає) іде як є, щоб
   * її можна було розібрати; будь-яка інша (мережа: URL з токеном) — новою помилкою з уже замаскованим текстом.
   */
  async call<T>(run: (api: Telegram) => Promise<T>): Promise<T> {
    const api = this._api;
    const env = this._env;
    if (!api || !env) throw new Error('Telegram-бот не запущено');
    try {
      return await run(api);
    } catch (error) {
      if (error instanceof TelegramError) throw error;
      throw new Error(describeError(error, env.token));
    }
  }

  /** HTML-повідомлення в чат або топік, за бажанням з кнопками. */
  async send(dto: SendTelegramMessageDto): Promise<void> {
    await this.call((api) =>
      api.sendMessage(toChatId(dto.chatId), dto.html, {
        parse_mode: 'HTML',
        ...(dto.threadId !== undefined ? { message_thread_id: dto.threadId } : {}),
        ...(dto.keyboard ? { reply_markup: dto.keyboard } : {}),
      }),
    );
  }
}
