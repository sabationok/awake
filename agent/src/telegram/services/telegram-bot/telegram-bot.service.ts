import { setTimeout as delay } from 'node:timers/promises';
import { Injectable, Logger } from '@nestjs/common';
import { Context, Telegraf, TelegramError } from 'telegraf';
import { AppException } from '../../../common/app-exception';
import { ModulesService } from '../../../modules/modules.service';
import type { BotCommand, MacModule, ModuleBot } from '../../../modules/types/mac-module';
import { describeError } from '../../helpers/describe-error';
import { readTelegramEnv } from '../../helpers/read-telegram-env';
import type { TelegramEnv } from '../../types/telegram-env.types';
import { BOT_TEXTS } from './constants/bot-texts';
import { MENU_REFRESH_MS } from './constants/menu-refresh-ms';
import { STOP_RETRY_LIMIT, STOP_RETRY_MS } from './constants/polling';
import { buildBotCommands } from './helpers/build-bot-commands';
import { buildHelpText } from './helpers/build-help-text';
import { buildMenuKeyboard } from './helpers/build-menu-keyboard';
import { decodeCallback } from './helpers/callback-data';
import { isOwnerChat } from './helpers/is-owner-chat';

type BotModule = MacModule & { bot: ModuleBot };

/**
 * Telegram-бот MaControl: long polling, команди складаються з модулів. Кожен модуль із `bot` дає вхідну команду
 * (`/awake`: меню з кнопками) і команди другого рівня (`/awake_start 2h`); усе йде через ModulesService.
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

    const help = (ctx: Context) => this._safe(ctx, env, () => ctx.reply(buildHelpText(this._modules.list())));
    bot.start(help);
    bot.help(help);

    for (const module of this._botModules()) {
      bot.command(module.bot.command, (ctx) => this._safe(ctx, env, () => this._replyMenu(ctx, module)));
      for (const command of module.bot.commands ?? []) {
        bot.command(`${module.bot.command}_${command.name}`, (ctx) =>
          this._safe(ctx, env, () => this._runCommand(ctx, module, command, ctx.payload)),
        );
      }
    }

    bot.action(/^(act|menu):/, (ctx) =>
      this._safe(ctx, env, async () => {
        const callback = decodeCallback(ctx.match.input);
        const module = callback && this._botModules().find((m) => m.id === callback.module);
        if (!callback || !module) {
          await ctx.answerCbQuery(BOT_TEXTS.unknown);
          return;
        }
        if (callback.kind === 'menu') {
          await ctx.answerCbQuery(BOT_TEXTS.answerRefresh);
          await this._editMenu(ctx, env, module);
          return;
        }
        await ctx.answerCbQuery(BOT_TEXTS.answerDone);
        await this._dispatch(module.id, callback.action, callback.params);
        await delay(MENU_REFRESH_MS);
        await this._editMenu(ctx, env, module);
      }),
    );
  }

  private _replyMenu(ctx: Context, module: BotModule) {
    const menu = module.bot.menu(this._modules.context(module.id));
    return ctx.reply(menu.text, { parse_mode: 'HTML', reply_markup: buildMenuKeyboard(module.id, menu) });
  }

  private async _runCommand(ctx: Context, module: BotModule, command: BotCommand, payload: string) {
    const value = payload.trim();
    if (command.arg && value && !command.arg.pattern.test(value)) {
      await ctx.reply(command.arg.invalid);
      return;
    }
    await this._dispatch(module.id, command.action, command.arg && value ? { [command.arg.param]: value } : undefined);
    await ctx.reply(command.reply);
  }

  private async _editMenu(ctx: Context, env: TelegramEnv, module: BotModule) {
    const menu = module.bot.menu(this._modules.context(module.id));
    try {
      await ctx.editMessageText(menu.text, { parse_mode: 'HTML', reply_markup: buildMenuKeyboard(module.id, menu) });
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
