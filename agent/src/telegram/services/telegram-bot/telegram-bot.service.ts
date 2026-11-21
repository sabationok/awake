import { Agent } from 'node:https';
import { setTimeout as delay } from 'node:timers/promises';
import { Injectable, Logger } from '@nestjs/common';
import { Context, Telegraf, TelegramError } from 'telegraf';
import type { BotMenu, BotNamespace } from '../../../bot';
import { BotJournalService, stripHtml } from '../../../bot-journal';
import type { BotMessageRecord } from '../../../bot-journal';
import { botCommandSettingKey } from '../../../modules/bot/helpers/bot-command-setting-key';
import { AppException } from '../../../common/app-exception';
import { ModulesService } from '../../../modules/modules.service';
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

/** Що пишемо в журнал про вхідну команду чи кнопку. */
type JournalEntry = Pick<BotMessageRecord, 'type' | 'namespace' | 'text'>;

/**
 * Telegram-бот MaControl: long polling, команди складаються з модулів. Модуль із `bot` дає вхідну команду
 * (`/awake`) з інлайн-меню, по якому ходять вглиб екранами (`nav:awake:sleep`). Команд другого рівня немає.
 * Усі дії йдуть через ModulesService.
 */
@Injectable()
export class TelegramBotService {
  private readonly _logger = new Logger(TelegramBotService.name);
  private _bot: Telegraf | null = null;
  private _env: TelegramEnv | null = null;

  constructor(
    private readonly _modules: ModulesService,
    private readonly _journal: BotJournalService,
  ) {}

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
    this._journal.setRunning(false);
  }

  /** Перемикач команди в модулі Bot змінився: оновлюємо меню команд Telegram. */
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
      this._journal.record({ direction: 'out', type: 'notify', namespace: null, text: stripHtml(html) });
    } catch (error) {
      const message = describeError(error, env.token);
      this._logger.error(`Сповіщення в Telegram не надіслано: ${message}`);
      this._journal.record({ direction: 'out', type: 'notify', namespace: null, text: stripHtml(html), ok: false, error: message });
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
        if (this._bot === bot) this._journal.setRunning(true);
      });
    } catch (error) {
      if (this._bot === bot) {
        this._bot = null;
        this._journal.setRunning(false);
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

    const help = (text: string) => (ctx: Context) =>
      this._safe(ctx, env, { type: 'command', namespace: null, text }, () =>
        ctx.reply(buildHelpText(this._namespaces()), { reply_markup: buildStartKeyboard(this._namespaces()) }),
      );
    bot.start(help('/start'));
    bot.help(help('/help'));

    // Команди реєструються всі: перемикач у модулі Bot перевіряється на кожному виклику, без перезапуску polling-у.
    for (const { namespace, command } of this._modules.botNamespaces()) {
      if (!command) continue;
      bot.command(command, (ctx) => {
        const entry = { type: 'command', namespace, text: `/${command}` } as const;
        if (!this._isEnabled(namespace)) return this._deny(ctx, entry, () => ctx.reply(BOT_TEXTS.disabled));
        return this._safe(ctx, env, entry, () => this._replyMenu(ctx, namespace));
      });
    }

    bot.action(/^(nav|do|act|menu):/, (ctx) => {
      const callback = decodeCallback(ctx.match.input);
      const known = callback && this._modules.botNamespaces().some((ns) => ns.namespace === callback.module);
      if (!callback || !known) return ctx.answerCbQuery(BOT_TEXTS.unknown);
      const entry = {
        type: 'button',
        namespace: callback.module,
        text: callback.kind === 'nav' ? `${callback.module} → ${callback.screen || 'меню'}` : `${callback.module}.${callback.action}`,
      } as const;
      if (!this._isEnabled(callback.module)) return this._deny(ctx, entry, () => ctx.answerCbQuery(BOT_TEXTS.disabled));
      return this._safe(ctx, env, entry, async () => {
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

  /** Увімкнені в модулі Bot namespace-и: для меню команд, /start і /help. */
  private _namespaces(): BotNamespace[] {
    return this._modules.botNamespaces().filter((ns) => this._isEnabled(ns.namespace));
  }

  private _isEnabled(namespace: string): boolean {
    return this._modules.context('bot').setting<boolean>(botCommandSettingKey(namespace));
  }

  /** Модуль вимкнено в MaControl: відповідаємо коротко й пишемо в журнал як `denied`. */
  private async _deny(ctx: Context, entry: JournalEntry, answer: () => Promise<unknown>) {
    this._journal.record({ direction: 'in', ...entry, ok: false, error: 'denied' });
    try {
      await answer();
    } catch {
      // Відповідь на вимкнену команду не критична.
    }
    void ctx;
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

  /** Виконує команду чи кнопку й пише її в журнал з результатом. */
  private async _safe(ctx: Context, env: TelegramEnv, entry: JournalEntry, run: () => Promise<unknown>) {
    try {
      await run();
      this._journal.record({ direction: 'in', ...entry });
    } catch (error) {
      if (error instanceof AppException) {
        this._journal.record({ direction: 'in', ...entry, ok: false, error: error.message });
        await ctx.reply(`⚠️ ${error.message}`);
        return;
      }
      const message = describeError(error, env.token);
      this._logger.error(`Команда Telegram не виконалась: ${message}`);
      this._journal.record({ direction: 'in', ...entry, ok: false, error: message });
      await ctx.reply(`⚠️ ${BOT_TEXTS.commandFailed}`);
    }
  }
}
