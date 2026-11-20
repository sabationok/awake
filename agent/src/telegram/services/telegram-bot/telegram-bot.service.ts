import { Agent } from 'node:https';
import { setTimeout as delay } from 'node:timers/promises';
import { Injectable, Logger } from '@nestjs/common';
import { Context, Telegraf, TelegramError } from 'telegraf';
import { AppException } from '../../../common/app-exception';
import { ModulesService } from '../../../modules/modules.service';
import type { MacModule, ModuleBot } from '../../../modules/types/mac-module';
import { describeError } from '../../helpers/describe-error';
import { readTelegramEnv } from '../../helpers/read-telegram-env';
import type { TelegramEnv } from '../../types/telegram-env.types';
import { BOT_TEXTS } from './constants/bot-texts';
import { MENU_REFRESH_MS } from './constants/menu-refresh-ms';
import { STOP_RETRY_LIMIT, STOP_RETRY_MS } from './constants/polling';
import { buildBotCommands } from './helpers/build-bot-commands';
import { buildHelpText } from './helpers/build-help-text';
import { buildMenuKeyboard } from './helpers/build-menu-keyboard';
import { buildStartKeyboard } from './helpers/build-start-keyboard';
import { decodeCallback } from './helpers/callback-data';
import { isOwnerChat } from './helpers/is-owner-chat';

type BotModule = MacModule & { bot: ModuleBot };

/**
 * Telegram-бот MaControl: long polling, команди складаються з модулів. Модуль із `bot` дає вхідну команду
 * (`/awake`) з інлайн-меню, по якому ходять вглиб екранами (`nav:awake:sleep`). Команд другого рівня немає.
 * Усі дії йдуть через ModulesService.
 */
@Injectable()
export class TelegramBotService {
  private readonly _logger = new Logger(TelegramBotService.name);
  private _bot: Telegraf | null = null;

  constructor(private readonly _modules: ModulesService) {}

  start(): void {
    if (this._bot) return;
    const env = readTelegramEnv();
    if (!env) {
      this._logger.warn('telegram.env без TG_BOT_TOKEN або TG_CHAT_ID, бот не запущено');
      return;
    }
    // IPv4: у частині мереж IPv6 до api.telegram.org висить і рветься через хвилину,
    // а Telegraf сам на IPv4 не перемикається (setMyCommands і polling мовчки зависали).
    const bot = new Telegraf(env.token, { telegram: { agent: new Agent({ keepAlive: true, family: 4 }) } });
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
      await bot.telegram.setMyCommands(buildBotCommands(this._modules.list()));
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

  private _botModules(): BotModule[] {
    return this._modules.list().filter((module): module is BotModule => !!module.bot);
  }

  private _register(bot: Telegraf, env: TelegramEnv) {
    bot.catch((error) => this._logger.error(`Помилка Telegram-бота: ${describeError(error, env.token)}`));

    bot.use(async (ctx, next) => {
      if (!isOwnerChat(ctx.chat, ctx.from, env.chatId)) return;
      await next();
    });

    const help = (ctx: Context) =>
      this._safe(ctx, env, () =>
        ctx.reply(buildHelpText(this._modules.list()), { reply_markup: buildStartKeyboard(this._modules.list()) }),
      );
    bot.start(help);
    bot.help(help);

    for (const module of this._botModules()) {
      const base = module.bot.command;
      if (!base) continue;
      bot.command(base, (ctx) => this._safe(ctx, env, () => this._replyMenu(ctx, module)));
    }

    bot.action(/^(nav|do|act|menu):/, (ctx) =>
      this._safe(ctx, env, async () => {
        const callback = decodeCallback(ctx.match.input);
        const module = callback && this._botModules().find((m) => m.id === callback.module);
        if (!callback || !module) {
          await ctx.answerCbQuery(BOT_TEXTS.unknown);
          return;
        }
        if (callback.kind === 'nav') {
          await ctx.answerCbQuery();
          await this._editMenu(ctx, env, module, callback.screen);
          return;
        }
        await ctx.answerCbQuery(BOT_TEXTS.answerDone);
        await this._dispatch(module.id, callback.action, callback.params);
        // Mac застосовує дію і шле новий стан: чекаємо його, щоб екран показав результат.
        await delay(MENU_REFRESH_MS);
        await this._editMenu(ctx, env, module, callback.screen);
      }),
    );
  }

  private _replyMenu(ctx: Context, module: BotModule) {
    const menu = module.bot.menu(this._modules.context(module.id), '');
    return ctx.reply(menu.text, { parse_mode: 'HTML', reply_markup: buildMenuKeyboard(module.id, '', menu) });
  }

  private async _editMenu(ctx: Context, env: TelegramEnv, module: BotModule, screen: string) {
    const menu = module.bot.menu(this._modules.context(module.id), screen);
    try {
      await ctx.editMessageText(menu.text, { parse_mode: 'HTML', reply_markup: buildMenuKeyboard(module.id, screen, menu) });
    } catch (error) {
      // Стан не змінився: Telegram відмовляє в редагуванні на той самий текст, це не помилка.
      if (error instanceof TelegramError && error.description.includes('message is not modified')) return;
      throw new Error(describeError(error, env.token));
    }
  }

  private _dispatch(module: string, name: string, params?: Record<string, string>) {
    return this._modules.dispatch({ type: 'action', action: { module, name, params } }, 'telegram');
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
