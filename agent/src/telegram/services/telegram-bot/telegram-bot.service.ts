import { Injectable, Logger } from '@nestjs/common';
import { Context, Telegraf, TelegramError } from 'telegraf';
import type { InlineKeyboardMarkup } from 'telegraf/types';
import { AppException } from '../../../common/app-exception';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../../modules/modules.service';
import { describeError } from '../../helpers/describe-error';
import { readTelegramEnv } from '../../helpers/read-telegram-env';
import type { TelegramEnv } from '../../types/telegram-env.types';
import { AWAKE_QUICK_DURATIONS, DURATION_PATTERN } from './constants/awake-durations';
import { TELEGRAM_BOT_COMMANDS } from './constants/bot-commands';
import { BOT_TEXTS } from './constants/bot-texts';
import { STOP_RETRY_LIMIT, STOP_RETRY_MS } from './constants/polling';
import { buildAwakeKeyboard } from './helpers/build-awake-keyboard';
import { formatStatusText } from './helpers/format-status-text';
import { isOwnerChat } from './helpers/is-owner-chat';

type AwakeAction = 'start' | 'stop' | 'lock' | 'displayOff';

/** Telegram-бот MacCC: long polling, команди йдуть тільки через ModulesService. */
@Injectable()
export class TelegramBotService {
  private readonly _logger = new Logger(TelegramBotService.name);
  private _bot: Telegraf | null = null;

  constructor(
    private readonly _modules: ModulesService,
    private readonly _macBridge: MacBridgeService,
  ) {}

  start(): void {
    if (this._bot) return;
    const env = readTelegramEnv();
    if (!env) {
      this._logger.warn('telegram.env без TG_BOT_TOKEN або TG_CHAT_ID, бот не запущено');
      return;
    }
    const bot = new Telegraf(env.token);
    this._register(bot, env);
    this._bot = bot;
    void this._launch(bot, env);
  }

  stop(): void {
    const bot = this._bot;
    if (!bot) return;
    this._bot = null;
    this._stopPolling(bot);
  }

  private async _launch(bot: Telegraf, env: TelegramEnv) {
    try {
      await bot.telegram.setMyCommands(TELEGRAM_BOT_COMMANDS);
    } catch (error) {
      this._logger.warn(`setMyCommands не вдався: ${describeError(error, env.token)}`);
    }
    // Бот могли зупинити, поки йшов setMyCommands: тоді polling уже не запускаємо.
    if (this._bot !== bot) return;
    try {
      await bot.launch({ dropPendingUpdates: true });
    } catch (error) {
      if (this._bot === bot) {
        this._bot = null;
        this._logger.error(`Telegram-бот не запустився: ${describeError(error, env.token)}`);
      }
    }
  }

  /** Поки polling не стартував (getMe, deleteWebhook), stop кидає помилку: повторюємо, доки він з'явиться. */
  private _stopPolling(bot: Telegraf) {
    const tryStop = () => {
      try {
        bot.stop('stop');
        return true;
      } catch {
        return false;
      }
    };
    if (tryStop()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (tryStop() || attempts >= STOP_RETRY_LIMIT) clearInterval(timer);
    }, STOP_RETRY_MS);
    timer.unref();
  }

  private _register(bot: Telegraf, env: TelegramEnv) {
    bot.catch((error) => this._logger.error(`Помилка Telegram-бота: ${describeError(error, env.token)}`));

    bot.use(async (ctx, next) => {
      if (!isOwnerChat(ctx.chat, ctx.from, env.chatId)) return;
      await next();
    });

    bot.command('start', (ctx) => this._safe(ctx, env, () => this._start(ctx, ctx.payload)));
    bot.command('stop', (ctx) =>
      this._safe(ctx, env, async () => {
        await this._dispatch('stop');
        await ctx.reply(BOT_TEXTS.stopping);
      }),
    );
    bot.command('lock', (ctx) =>
      this._safe(ctx, env, async () => {
        await this._dispatch('lock');
        await ctx.reply(BOT_TEXTS.locking);
      }),
    );
    bot.command('screen', (ctx) =>
      this._safe(ctx, env, async () => {
        await this._dispatch('displayOff');
        await ctx.reply(BOT_TEXTS.displayOff);
      }),
    );
    bot.command('status', (ctx) =>
      this._safe(ctx, env, () => ctx.reply(formatStatusText(this._macBridge.state), { parse_mode: 'HTML' })),
    );
    bot.command('awake', (ctx) =>
      this._safe(ctx, env, () =>
        ctx.reply(formatStatusText(this._macBridge.state), {
          parse_mode: 'HTML',
          reply_markup: buildAwakeKeyboard(),
        }),
      ),
    );

    bot.action(/^start:(\S+)$/, (ctx) =>
      this._safe(ctx, env, async () => {
        const duration = ctx.match[1];
        if (!DURATION_PATTERN.test(duration)) {
          await ctx.answerCbQuery(BOT_TEXTS.invalidDuration);
          return;
        }
        const label = AWAKE_QUICK_DURATIONS.find((item) => item.duration === duration)?.label ?? duration;
        await ctx.answerCbQuery(`${BOT_TEXTS.answerStart} ${label}`);
        await this._dispatch('start', { duration });
      }),
    );
    bot.action('stop', (ctx) =>
      this._safe(ctx, env, async () => {
        await ctx.answerCbQuery(BOT_TEXTS.answerStop);
        await this._dispatch('stop');
      }),
    );
    bot.action('status', (ctx) =>
      this._safe(ctx, env, async () => {
        await ctx.answerCbQuery(BOT_TEXTS.answerRefresh);
        await this._editStatus(ctx, env, buildAwakeKeyboard());
      }),
    );
  }

  private async _start(ctx: Context, payload: string) {
    const duration = payload.trim();
    if (duration && !DURATION_PATTERN.test(duration)) {
      await ctx.reply(BOT_TEXTS.invalidDuration);
      return;
    }
    await this._dispatch('start', duration ? { duration } : undefined);
    await ctx.reply(BOT_TEXTS.starting);
  }

  private async _editStatus(ctx: Context, env: TelegramEnv, keyboard: InlineKeyboardMarkup) {
    try {
      await ctx.editMessageText(formatStatusText(this._macBridge.state), {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (error) {
      // Статус не змінився: Telegram відмовляє в редагуванні на той самий текст, це не помилка.
      if (error instanceof TelegramError && error.description.includes('message is not modified')) return;
      throw new Error(describeError(error, env.token));
    }
  }

  private _dispatch(name: AwakeAction, params?: Record<string, string>) {
    return this._modules.dispatch({ type: 'action', action: { module: 'awake', name, params } }, 'telegram');
  }

  private async _safe(ctx: Context, env: TelegramEnv, run: () => Promise<unknown>) {
    try {
      await run();
    } catch (error) {
      if (error instanceof AppException) {
        await ctx.reply(`⚠️ ${error.message}`);
        return;
      }
      this._logger.error(`Команда Telegram не виконалась: ${describeError(error, env.token)}`);
      await ctx.reply(`⚠️ ${BOT_TEXTS.commandFailed}`);
    }
  }
}
