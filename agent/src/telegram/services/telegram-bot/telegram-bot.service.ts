import { Agent } from 'node:https';
import { setTimeout as delay } from 'node:timers/promises';
import { Injectable, Logger } from '@nestjs/common';
import { Context, Telegraf, TelegramError } from 'telegraf';
import type { BotMenu, BotNamespace } from '../../../bot';
import { BotJournalService } from '../../../bot-journal';
import { AppException } from '../../../common/app-exception';
import { ModulesService } from '../../../modules/modules.service';
import { TransportsService } from '../../../transports';
import { TELEGRAM_METRICS } from '../../constants/telegram-metrics';
import { describeError } from '../../helpers/describe-error';
import { readTelegramEnv } from '../../helpers/read-telegram-env';
import { telegramCommandSettingKey } from '../../helpers/telegram-command-setting-key';
import { TelegramStateService } from '../../state/telegram-state.service';
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

/**
 * Telegram-бот MaControl: long polling, команди складаються з модулів. Модуль із `bot` дає вхідну команду
 * (`/awake`) з інлайн-меню, по якому ходять вглиб екранами (`nav:awake:sleep`). Команд другого рівня немає.
 * Усі дії йдуть через ModulesService, він і пише їх у журнал бота; тут лише лічильники Telegram (відмови, сповіщення).
 */
@Injectable()
export class TelegramBotService {
  private readonly _logger = new Logger(TelegramBotService.name);
  private _bot: Telegraf | null = null;
  private _env: TelegramEnv | null = null;

  constructor(
    private readonly _modules: ModulesService,
    private readonly _journal: BotJournalService,
    private readonly _state: TelegramStateService,
    transports: TransportsService,
  ) {
    transports.register({
      id: 'telegram',
      title: 'Telegram',
      icon: { symbol: 'paperplane.fill', tone: 'accent' },
      status: () => ({ online: _state.state.running, hint: _state.state.running ? 'Polling працює' : 'Бот вимкнено або немає telegram.env' }),
    });
  }

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
    this._env = env;
    void this._launch(bot, env);
  }

  stop(): void {
    const bot = this._bot;
    if (!bot) return;
    this._bot = null;
    this._env = null;
    this._stopPolling(bot);
    this._state.setRunning(false);
  }

  /** Перемикач команди в модулі Telegram змінився: оновлюємо меню команд Telegram. */
  async refreshCommands(): Promise<void> {
    const bot = this._bot;
    const env = this._env;
    if (!bot || !env) return;
    try {
      await bot.telegram.setMyCommands(buildBotCommands(this._namespaces()));
    } catch (error) {
      this._logger.warn(`setMyCommands не вдався: ${describeError(error, env.token)}`);
    }
  }

  /** Сповіщення в чат власника (HTML). Бот вимкнено — мовчки нічого; збій лише в лог, бо подію вже записано. */
  async notify(html: string): Promise<void> {
    const bot = this._bot;
    const env = this._env;
    if (!bot || !env) return;
    try {
      await bot.telegram.sendMessage(env.chatId, html, { parse_mode: 'HTML' });
      this._journal.count([TELEGRAM_METRICS.notify]);
    } catch (error) {
      this._logger.error(`Сповіщення в Telegram не надіслано: ${describeError(error, env.token)}`);
      this._journal.count([TELEGRAM_METRICS.notifyFailed]);
    }
  }

  private async _launch(bot: Telegraf, env: TelegramEnv) {
    try {
      await bot.telegram.setMyCommands(buildBotCommands(this._namespaces()));
    } catch (error) {
      this._logger.warn(`setMyCommands не вдався: ${describeError(error, env.token)}`);
    }
    // Бот могли зупинити, поки йшов setMyCommands: тоді polling уже не запускаємо.
    if (this._bot !== bot) return;
    try {
      await bot.launch({ dropPendingUpdates: true }, () => {
        if (this._bot === bot) this._state.setRunning(true);
      });
    } catch (error) {
      if (this._bot === bot) {
        this._bot = null;
        this._state.setRunning(false);
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

    const help = (ctx: Context) =>
      this._safe(ctx, env, () => ctx.reply(buildHelpText(this._namespaces()), { reply_markup: buildStartKeyboard(this._namespaces()) }));
    bot.start(help);
    bot.help(help);

    // Команди реєструються всі: перемикач у модулі Telegram перевіряється на кожному виклику, без перезапуску polling-у.
    for (const { namespace, command } of this._modules.botNamespaces()) {
      if (!command) continue;
      bot.command(command, (ctx) => {
        if (!this._isEnabled(namespace)) return this._deny(() => ctx.reply(BOT_TEXTS.disabled));
        return this._safe(ctx, env, () => this._replyMenu(ctx, namespace));
      });
    }

    bot.action(/^(nav|do|act|menu):/, (ctx) => {
      const callback = decodeCallback(ctx.match.input);
      const known = callback && this._modules.botNamespaces().some((ns) => ns.namespace === callback.module);
      if (!callback || !known) return ctx.answerCbQuery(BOT_TEXTS.unknown);
      if (!this._isEnabled(callback.module)) return this._deny(() => ctx.answerCbQuery(BOT_TEXTS.disabled));
      return this._safe(ctx, env, async () => {
        if (callback.kind === 'nav') {
          await ctx.answerCbQuery();
          await this._editMenu(ctx, env, callback.module, callback.screen);
          return;
        }
        await ctx.answerCbQuery(BOT_TEXTS.answerDone);
        await this._dispatch(callback.module, callback.action, callback.params);
        // Mac застосовує дію і шле новий стан: чекаємо його, щоб екран показав результат.
        await delay(MENU_REFRESH_MS);
        await this._editMenu(ctx, env, callback.module, callback.screen);
      });
    });
  }

  /** Увімкнені в модулі Telegram namespace-и: для меню команд, /start і /help. */
  private _namespaces(): BotNamespace[] {
    return this._modules.botNamespaces().filter((ns) => this._isEnabled(ns.namespace));
  }

  private _isEnabled(namespace: string): boolean {
    return this._modules.context('telegram').setting<boolean>(telegramCommandSettingKey(namespace));
  }

  /** Модуль вимкнено для Telegram: відповідаємо коротко й рахуємо відмову. У журнал бота не йде, бо до бота виклик не дійшов. */
  private async _deny(answer: () => Promise<unknown>) {
    this._journal.count([TELEGRAM_METRICS.denied]);
    try {
      await answer();
    } catch {
      // Відповідь на вимкнену команду не критична.
    }
  }

  private async _replyMenu(ctx: Context, namespace: string) {
    const menu = await this._menu(namespace, '');
    return ctx.reply(menu.text, { parse_mode: 'HTML', reply_markup: buildMenuKeyboard(namespace, '', menu) });
  }

  private async _editMenu(ctx: Context, env: TelegramEnv, namespace: string, screen: string) {
    const menu = await this._menu(namespace, screen);
    try {
      await ctx.editMessageText(menu.text, { parse_mode: 'HTML', reply_markup: buildMenuKeyboard(namespace, screen, menu) });
    } catch (error) {
      // Стан не змінився: Telegram відмовляє в редагуванні на той самий текст, це не помилка.
      if (error instanceof TelegramError && error.description.includes('message is not modified')) return;
      throw new Error(describeError(error, env.token));
    }
  }

  /** Namespace без жодного `@BotScreen` усе одно відповідає: порожнім екраном з «Оновити». */
  private async _menu(namespace: string, screen: string): Promise<BotMenu> {
    return (await this._modules.screen(namespace, screen, 'telegram')) ?? { text: BOT_TEXTS.unknown, buttons: [] };
  }

  private _dispatch(module: string, name: string, params?: Record<string, string>) {
    return this._modules.dispatch({ type: 'action', action: { module, name, params } }, 'telegram');
  }

  /** Виконує команду чи кнопку; помилку показує в чаті. Журнал пише ModulesService. */
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
