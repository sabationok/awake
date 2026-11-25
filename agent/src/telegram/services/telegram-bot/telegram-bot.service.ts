import { Agent } from 'node:https';
import { setTimeout as delay } from 'node:timers/promises';
import { Injectable, Logger } from '@nestjs/common';
import { Context, Telegraf, TelegramError } from 'telegraf';
import type { Chat, Message, User } from 'telegraf/types';
import type { BotMenu, BotNamespace, BotViaInfo } from '../../../bot';
import { AppException } from '../../../common/app-exception';
import { ModulesService } from '../../../modules/modules.service';
import { TransportsService } from '../../../transports';
import { TELEGRAM_EVENTS_STAT_NS, TELEGRAM_METRICS } from '../../constants/telegram-metrics';
import { StatsService } from '../../../stats';
import type { TelegramAddresseeDto } from '../../groups/dto/telegram-addressee.dto';
import { classifySendError } from '../../groups/helpers/classify-send-error';
import { toChatId } from '../../groups/helpers/to-chat-id';
import { TelegramClientService } from '../../groups/telegram-client.service';
import { TelegramGroupsListener } from '../../groups/telegram-groups.listener';
import type { TelegramSendResult } from '../../groups/types/telegram-send-result.types';
import { describeError } from '../../helpers/describe-error';
import { readTelegramEnv } from '../../helpers/read-telegram-env';
import { telegramCommandSettingKey } from '../../helpers/telegram-command-setting-key';
import { TelegramStateService } from '../../state/telegram-state.service';
import type { TelegramEnv } from '../../types/telegram-env.types';
import { BOT_TEXTS } from './constants/bot-texts';
import { MENU_REFRESH_MS } from './constants/menu-refresh-ms';
import { ALLOWED_UPDATES, MISSED_UPDATES_LIMIT, STOP_RETRY_LIMIT, STOP_RETRY_MS } from './constants/polling';
import { buildBotCommands } from './helpers/build-bot-commands';
import { buildHelpText } from './helpers/build-help-text';
import { buildMenuKeyboard } from './helpers/build-menu-keyboard';
import { buildStartKeyboard } from './helpers/build-start-keyboard';
import { decodeCallback } from './helpers/callback-data';
import { decideUpdateAccess, type UpdateAccess } from './helpers/decide-update-access';
import { formatClockSeconds } from './helpers/format-clock-seconds';
import { RefusalThrottle } from './helpers/refusal-throttle';

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
  private readonly _refusals = new RefusalThrottle();

  constructor(
    private readonly _modules: ModulesService,
    private readonly _state: TelegramStateService,
    private readonly _stats: StatsService,
    private readonly _client: TelegramClientService,
    private readonly _groups: TelegramGroupsListener,
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
    const agent = new Agent({ keepAlive: true, family: 4 });
    // apiRoot є лише з локальним mock-сервером; для http Telegraf сам відкидає https-агент.
    const bot = new Telegraf(env.token, { telegram: env.apiRoot ? { agent, apiRoot: env.apiRoot } : { agent } });
    if (env.apiRoot) this._logger.warn(`Bot API: локальний mock ${env.apiRoot}`);
    this._register(bot, env);
    this._bot = bot;
    this._env = env;
    this._client.attach(bot.telegram, env);
    void this._launch(bot, env);
  }

  stop(): void {
    const bot = this._bot;
    if (!bot) return;
    this._bot = null;
    this._env = null;
    this._client.detach();
    this._stopPolling(bot);
    this._state.setRunning(false);
  }

  /** Перемикач команди в модулі Telegram або прив'язана група змінились: оновлюємо меню команд Telegram. */
  async refreshCommands(): Promise<void> {
    const bot = this._bot;
    const env = this._env;
    if (!bot || !env) return;
    await this._setCommands(bot, env);
  }

  /**
   * Сповіщення (HTML): без адресата — в чат власника, з адресатом — у його чат і топік. Бот вимкнено — мовчки нічого;
   * збій лише в лог, бо подію вже записано. Результат потрібен черзі групи: чекати, створити топік заново чи здатись.
   */
  async notify(html: string, to?: TelegramAddresseeDto): Promise<TelegramSendResult> {
    const bot = this._bot;
    const env = this._env;
    if (!bot || !env) return { ok: false, reason: 'stopped' };
    try {
      await bot.telegram.sendMessage(to ? toChatId(to.chatId) : env.chatId, html, {
        parse_mode: 'HTML',
        ...(to?.threadId !== undefined ? { message_thread_id: to.threadId } : {}),
      });
      this._count(TELEGRAM_METRICS.notify);
      return { ok: true };
    } catch (error) {
      const failure = classifySendError(error);
      // `429` у групі — не збій, а пауза: чергу групи веде TelegramGroupDeliveryService, він же рахує `groups.events`.
      if (failure.reason === 'rateLimited' && to) {
        this._logger.warn(`Telegram просить зачекати ${failure.retryAfterMs} мс перед сповіщенням у групу`);
        return failure;
      }
      this._logger.error(`Сповіщення в Telegram не надіслано: ${describeError(error, env.token)}`);
      this._count(TELEGRAM_METRICS.notifyFailed);
      return failure;
    }
  }

  /** Група, якій востаннє ставили меню команд: з неї його прибирають, коли дозвіл знято або він перейшов до іншої. */
  private _menuChatId: number | string | null = null;

  /**
   * Меню команд: загальне (`BotCommandScopeDefault`) і те саме для прив'язаної групи (`BotCommandScopeChat`), якщо
   * команди в групі ввімкнені (`groups.commands`); вимкнені — меню групи прибирається. Кожен виклик окремо: збій
   * одного не скасовує інший.
   */
  private async _setCommands(bot: Telegraf, env: TelegramEnv) {
    const commands = buildBotCommands(this._namespaces());
    try {
      await bot.telegram.setMyCommands(commands, { scope: { type: 'default' } });
    } catch (error) {
      this._logger.warn(`setMyCommands не вдався: ${describeError(error, env.token)}`);
    }
    const groupChatId = this._groups.commandsChatId();
    // Меню прибирається з групи, де команди вимкнули, і з групи, з якої зняли дозвіл (бот у ній лишився).
    const stale = new Set([this._menuChatId, groupChatId === null ? this._groups.boundChatId() : null]);
    stale.delete(groupChatId);
    stale.delete(null);
    for (const chatId of stale) {
      try {
        await bot.telegram.deleteMyCommands({ scope: { type: 'chat', chat_id: chatId as number | string } });
      } catch (error) {
        this._logger.warn(`deleteMyCommands для групи не вдався: ${describeError(error, env.token)}`);
      }
    }
    this._menuChatId = groupChatId;
    if (groupChatId === null) return;
    try {
      await bot.telegram.setMyCommands(commands, { scope: { type: 'chat', chat_id: groupChatId } });
    } catch (error) {
      this._logger.warn(`setMyCommands для групи не вдався: ${describeError(error, env.token)}`);
    }
  }

  private async _launch(bot: Telegraf, env: TelegramEnv) {
    await this._setCommands(bot, env);
    // Бот могли зупинити, поки йшов setMyCommands: тоді polling уже не запускаємо.
    if (this._bot !== bot) return;
    await this._answerMissed(bot, env);
    if (this._bot !== bot) return;
    try {
      // Список явний: без нього Telegram лишає попередній, а `my_chat_member` потрібен групам.
      await bot.launch({ dropPendingUpdates: true, allowedUpdates: [...ALLOWED_UPDATES] }, () => {
        if (this._bot === bot) this._state.setRunning(true);
      });
    } catch (error) {
      if (this._bot === bot) {
        this._bot = null;
        this._client.detach();
        this._state.setRunning(false);
        this._logger.error(`Telegram-бот не запустився: ${describeError(error, env.token)}`);
      }
    }
  }

  /**
   * Те, що прийшло, поки агент не працював. Команди й кнопки власника із запізненням не виконуємо (заснути «зараз»
   * через десять хвилин ніхто не чекає), але й не ковтаємо мовчки: одна відповідь «повтори» на чат. Зміни членства
   * бота в групах обробляємо як звичайно. Решту далі скидає `dropPendingUpdates`.
   */
  private async _answerMissed(bot: Telegraf, env: TelegramEnv) {
    try {
      await bot.telegram.deleteWebhook();
      const updates = await bot.telegram.getUpdates(0, MISSED_UPDATES_LIMIT, 0, [...ALLOWED_UPDATES]);
      const told = new Set<string>();
      for (const update of updates) {
        if ('my_chat_member' in update) {
          await this._groups.onMyChatMember(update.my_chat_member);
        } else if ('callback_query' in update) {
          const query = update.callback_query;
          if (this._access(env, query.message?.chat, query.from, undefined, true) !== 'handle') continue;
          await bot.telegram.answerCbQuery(query.id, BOT_TEXTS.missedShort).catch(() => undefined);
        } else if ('message' in update) {
          const message = update.message;
          const isCommand = 'entities' in message && message.entities?.some((entity) => entity.type === 'bot_command' && entity.offset === 0);
          if (!isCommand || this._access(env, message.chat, message.from, message, false) !== 'handle') continue;
          const threadId = message.is_topic_message ? message.message_thread_id : undefined;
          const key = `${message.chat.id}:${threadId ?? ''}`;
          if (told.has(key)) continue;
          told.add(key);
          await bot.telegram.sendMessage(message.chat.id, BOT_TEXTS.missed, threadId === undefined ? {} : { message_thread_id: threadId });
        }
      }
    } catch (error) {
      this._logger.warn(`Пропущені оновлення не оброблено: ${describeError(error, env.token)}`);
    }
  }

  /** Чи обробляти оновлення: одне рішення для polling-у і для пропущених оновлень. */
  private _access(env: TelegramEnv, chat: Chat | undefined, from: User | undefined, message: Message | undefined, isCallback: boolean): UpdateAccess {
    return decideUpdateAccess({
      ownerId: env.chatId,
      chat,
      from,
      senderChat: message?.sender_chat,
      isCallback,
      isBoundGroup: this._groups.isBoundChat(chat?.id),
      groupCommands: this._groups.commandsEnabled(),
      isTopicService: message !== undefined && ('forum_topic_closed' in message || 'forum_topic_reopened' in message),
    });
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
      // Бота додали, видалили чи змінили йому права: адаптеру груп, до будь-якої перевірки чату.
      if (ctx.myChatMember) return this._groups.onMyChatMember(ctx.myChatMember);
      const message = ctx.message;
      const access = this._access(env, ctx.chat, ctx.from, message, ctx.callbackQuery !== undefined);
      if (access === 'handle') return next();
      if (access === 'topicService' && message) this._groups.onServiceMessage(message);
      // Чужа кнопка (не власник або не наш чат): коротка відмова, але не на кожне натискання; чужому повідомленню — тиша.
      if (access === 'refuse' && this._refusals.allow(ctx.from?.id)) await ctx.answerCbQuery(BOT_TEXTS.unavailable).catch(() => undefined);
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
        // Кнопку натиснули в групі: дія знає про це (`@BotVia`), адмін-дії звідти відмовляють.
        const via: BotViaInfo = ctx.chat && ctx.chat.type !== 'private' ? { group: String(ctx.chat.id) } : {};
        await this._dispatch(callback.module, callback.action, callback.params, via);
        // Mac застосовує дію і шле новий стан: чекаємо його, щоб екран показав результат.
        await delay(MENU_REFRESH_MS);
        // Рядок з часом над меню: текст щоразу інший, тож редагування проходить і тоді, коли стан не змінився.
        await this._editMenu(ctx, env, callback.module, callback.screen, `✅ ${BOT_TEXTS.doneNote} · ${formatClockSeconds(new Date())}`);
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

  private _count(event: string) {
    this._stats.increment({ namespace: TELEGRAM_EVENTS_STAT_NS, metrics: { [event]: { count: 1 } } });
  }

  /** Модуль вимкнено для Telegram: відповідаємо коротко й рахуємо відмову. У журнал бота не йде, бо до бота виклик не дійшов. */
  private async _deny(answer: () => Promise<unknown>) {
    this._count(TELEGRAM_METRICS.denied);
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

  private async _editMenu(ctx: Context, env: TelegramEnv, namespace: string, screen: string, note?: string) {
    const menu = await this._menu(namespace, screen);
    try {
      await ctx.editMessageText(note ? `${note}\n\n${menu.text}` : menu.text, { parse_mode: 'HTML', reply_markup: buildMenuKeyboard(namespace, screen, menu) });
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

  private _dispatch(module: string, name: string, params: Record<string, string> | undefined, via: BotViaInfo) {
    return this._modules.dispatch({ type: 'action', action: { module, name, params } }, 'telegram', via);
  }

  /**
   * Виконує команду чи кнопку; помилку показує в чаті. Журнал пише ModulesService. Відповіді (`ctx.reply`) у групі
   * йдуть у той самий топік, звідки прийшла команда чи кнопка: Telegraf сам додає `message_thread_id` повідомлення теми.
   */
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
