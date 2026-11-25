import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { filter, type Subscription } from 'rxjs';
import { TelegramError } from 'telegraf';
import type { Chat, ChatMemberUpdated, InlineKeyboardMarkup, Message } from 'telegraf/types';
import { escapeHtml } from '../../common/escape-html';
import {
  errorMessage,
  GROUPS_MODULE,
  GROUPS_NOTIFICATION,
  GroupsBindingService,
  GroupsService,
  GroupsSettingsService,
  type GroupChatEntity,
  type GroupRefDto,
} from '../../groups';
import { ModulesService } from '../../modules/modules.service';
import { TelegramNotificationsService, type TelegramNotification } from '../notifications';
import { encodeAction } from '../services/telegram-bot/helpers/callback-data';
import { GROUP_LEAVE_RETRY_CHATS_LIMIT, GROUP_LEAVE_RETRY_MS, GROUP_RIGHTS_DEBOUNCE_MS } from './constants/telegram-group-guards';
import { TELEGRAM_GROUPS_MANIFEST } from './constants/telegram-groups-manifest';
import { ForeignNoticeThrottle } from './helpers/foreign-notice-throttle';
import { isChatMember } from './helpers/is-chat-member';
import { isOwnerInChat } from './helpers/is-owner-in-chat';
import { formatTelegramTopicsEnv, telegramTopicsEnvPath, writeTelegramTopicsEnv } from './helpers/telegram-topics-env';
import { toChatId } from './helpers/to-chat-id';
import { toGroupBotRights } from './helpers/to-group-bot-rights';
import { TelegramClientService } from './telegram-client.service';

type GroupChat = Chat.GroupChat | Chat.SupergroupChat;

/** Зміна прав, що чекає, поки смикання стихне: право керувати темами до першої зміни і таймер. */
interface PendingRights {
  couldManageTopics: boolean;
  title: string;
  timer: NodeJS.Timeout;
}

/**
 * Адаптер груп Telegram: переводить `my_chat_member` і службові повідомлення тем у виклики ядра груп, питає власника
 * в приватному чаті про прив'язку, виходить із чужих груп і тримає файл топіків для скрипта Mac. У чужу групу не
 * пише нічого. Текст учасників сюди не потрапляє. Що сталося з групою (чужа, видалили, забрали права), власник
 * дізнається через реєстр сповіщень (джерело `groups`, з перемикачами); лише запит «Прив'язати?» з кнопками йде в
 * приватний чат напряму й завжди.
 */
@Injectable()
export class TelegramGroupsListener implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(TelegramGroupsListener.name);
  private _subscriptions: Subscription[] = [];
  /** Останній записаний текст файла топіків: ядро сповіщає про кожен запис, а файл міняється рідко. */
  private _topicsEnv: string | null = null;
  private readonly _foreignNotices = new ForeignNoticeThrottle();
  /** Чужі чати, з яких вийти не вдалося: коли можна спробувати знову. */
  private readonly _leaveRetryAt = new Map<number, number>();
  private readonly _pendingRights = new Map<string, PendingRights>();

  constructor(
    private readonly _groups: GroupsService,
    private readonly _binding: GroupsBindingService,
    private readonly _client: TelegramClientService,
    private readonly _settings: GroupsSettingsService,
    private readonly _modules: ModulesService,
    private readonly _notifications: TelegramNotificationsService,
  ) {}

  onModuleInit() {
    this._syncTopicsEnv();
    this._subscriptions = [
      this._groups.changed$.subscribe(() => this._syncTopicsEnv()),
      // `groups.delivery` і `groups.topic.<source>` міняють те, що скрипт має знайти у файлі.
      this._modules.settingChanged$.pipe(filter((change) => change.module === GROUPS_MODULE)).subscribe(() => this._syncTopicsEnv()),
    ];
  }

  onModuleDestroy() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
    for (const pending of this._pendingRights.values()) clearTimeout(pending.timer);
    this._pendingRights.clear();
  }

  /** Чи це прив'язана група, в якій бот зараз є. */
  isBoundChat(chatId: number | undefined): boolean {
    const group = this._bound();
    return group !== null && chatId !== undefined && group.externalId === String(chatId);
  }

  /**
   * Чи слухати команди й кнопки в прив'язаній групі: перемикач `groups.commands` і можливість `commands` у маніфесті
   * конектора. Незадекларована можливість не працює, хоч би що було збережено.
   */
  commandsEnabled(): boolean {
    return this._groups.supports(TELEGRAM_GROUPS_MANIFEST.id, 'commands') && this._settings.commands();
  }

  /** `chat_id` прив'язаної групи, в якій бот зараз є; null — такої немає. */
  boundChatId(): number | string | null {
    const group = this._bound();
    return group ? toChatId(group.externalId) : null;
  }

  /** `chat_id` прив'язаної групи для її меню команд; null — групи немає або команди в групі вимкнені. */
  commandsChatId(): number | string | null {
    return this.commandsEnabled() ? this.boundChatId() : null;
  }

  /** Бота додали, видалили або змінили йому права. Приватний чат (заблокували бота) нас не цікавить. */
  async onMyChatMember(update: ChatMemberUpdated): Promise<void> {
    const { chat, from, old_chat_member: before, new_chat_member: after } = update;
    if (chat.type === 'private') return;
    const wasIn = isChatMember(before);
    const isIn = isChatMember(after);
    if (chat.type === 'channel') {
      // Канали не підтримуються: бот виходить мовчки.
      if (isIn) await this._leave(chat.id);
      return;
    }
    if (!wasIn && isIn) return this._added(chat, update, false);
    if (wasIn && !isIn) return this._removed(chat, from.id === after.user.id);
    if (!isIn) return;
    const ref = this._ref(chat);
    if (this._groups.isKnownGroup(ref)) return this._rightsChanged(chat, update);
    // Чужа група, з якої вийти ще не вдалося: лише тиха повторна спроба, без нового запису, лічильника і сповіщення.
    if (this._groups.isForeignGroup(ref)) return this._leaveAgain(chat.id);
    // Невідома група, де бот уже є (його додали, поки агент не працював, і подія загубилась): це теж «додали»,
    // але хто додав, подія не каже: `from` тут — той, хто змінив права.
    return this._added(chat, update, true);
  }

  /** Тему прив'язаної групи закрили або відкрили руками: стан топіка в ядрі. Інші повідомлення — false. */
  onServiceMessage(message: Message): boolean {
    const group = this._bound();
    const threadId = message.message_thread_id;
    if (!group || threadId === undefined) return false;
    if ('forum_topic_closed' in message) this._groups.markTopicClosed({ groupId: group.id, threadId });
    else if ('forum_topic_reopened' in message) this._groups.markTopicReopened({ groupId: group.id, threadId });
    else return false;
    return true;
  }

  /**
   * Бот з'явився в групі. `byMembership` — подія не про додавання (бот там уже був), тож `from` не той, хто додав:
   * група вважається власниковою, якщо власник у ній є (`getChatMember`). Власник як `from` — завжди швидкий шлях.
   */
  private async _added(chat: GroupChat, update: ChatMemberUpdated, byMembership: boolean) {
    const ownerId = this._client.ownerId;
    let byOwner = ownerId !== null && String(update.from.id) === ownerId;
    if (!byOwner && byMembership && ownerId !== null) {
      const member = await this._ownerInChat(chat.id, ownerId);
      // Не вдалося дізнатись: не реєструємо і не виходимо, наступна подія з цієї групи спитає знову.
      if (member === null) return;
      byOwner = member;
    }
    const decision = this._groups.registerAdded({
      ...this._ref(chat),
      title: chat.title,
      addedBy: String(update.from.id),
      byOwner,
      botRights: toGroupBotRights(update.new_chat_member),
      topicsEnabled: isForum(chat),
    });
    if (decision.action === 'leave') {
      await this._leave(chat.id);
      this._notifyForeign(chat, update.from.id);
      return;
    }
    this._leaveRetryAt.delete(chat.id);
    if (decision.group.boundAt !== null) {
      // Бота повернули в уже прив'язану групу: доганяємо топіки, питати нічого.
      void this._binding.ensureTopics();
      return;
    }
    // Запит із кнопками — не сповіщення з перемикачем: без нього групу не прив'язати з Telegram.
    const fromOwner = ownerId !== null && String(update.from.id) === ownerId;
    // Власник лише учасник групи, а подію зробив хтось інший: це не його згода, тож кажемо прямо, хто і що.
    const text = fromOwner
      ? `👥 Бота додано в «${escapeHtml(chat.title)}». Прив'язати для сповіщень?`
      : `👥 Бот є в групі «${escapeHtml(chat.title)}», де ви учасник, але додали його не ви: права йому змінив користувач <code>${update.from.id}</code>. ` +
        'Прив\'язуйте, лише якщо це ваша група: у неї підуть сповіщення про Mac.';
    await this._tellOwner(text, confirmKeyboard(decision.group));
  }

  /** Сповіщення про чужу групу під обмежувачем: на чат, на того, хто додав, і загалом за годину. */
  private _notifyForeign(chat: GroupChat, adderId: number) {
    const decision = this._foreignNotices.decide({ chatId: String(chat.id), adderId: String(adderId) });
    if (decision.kind === 'skip') return;
    if (decision.kind === 'summary') {
      this._notify({
        source: GROUPS_MODULE,
        type: GROUPS_NOTIFICATION.foreignLeft,
        title: '🚫 Бота й далі додають у чужі групи, бот виходить; до кінця години про це більше не пишу',
        fields: {},
      });
      return;
    }
    this._notify({
      source: GROUPS_MODULE,
      type: GROUPS_NOTIFICATION.foreignLeft,
      title: '🚫 Бота додали в чужу групу, бот вийшов',
      fields: { group: chat.title, user: adderId, ...(decision.suppressed > 0 ? { suppressedBefore: decision.suppressed } : {}) },
    });
  }

  /** Чи власник є в чаті. null — дізнатись не вдалося (мережа, ліміт, бот не запущений). */
  private async _ownerInChat(chatId: number, ownerId: string): Promise<boolean | null> {
    const userId = Number(ownerId);
    if (!Number.isSafeInteger(userId)) return false;
    try {
      return isOwnerInChat(await this._client.call((api) => api.getChatMember(chatId, userId)));
    } catch (error) {
      // 400 — Telegram не знає такого учасника в цьому чаті: власника там немає.
      if (error instanceof TelegramError && error.code === 400) return false;
      this._logger.warn(`Чи є власник у групі, дізнатись не вдалося: ${errorMessage(error)}`);
      return null;
    }
  }

  private async _removed(chat: GroupChat, bySelf: boolean) {
    this._leaveRetryAt.delete(chat.id);
    const wasBound = this.isBoundChat(chat.id);
    this._groups.markRemoved(this._ref(chat));
    // Сам вийшов (чужа група, «Вийти з групи», «Відв'язати») — власник уже знає.
    if (wasBound && !bySelf) {
      this._notify({
        source: GROUPS_MODULE,
        type: GROUPS_NOTIFICATION.removed,
        title: '⚠️ Бота видалили з групи, сповіщення знову йдуть у приватний чат',
        fields: { group: chat.title },
      });
    }
  }

  /**
   * Права бота змінились. Стан у ядрі оновлюється одразу, а наслідки в прив'язаній групі (сповіщення «забрали
   * права», створення топіків) — раз, коли зміни стихнуть: порівнюється право до першої зміни і після останньої.
   */
  private async _rightsChanged(chat: GroupChat, update: ChatMemberUpdated) {
    const before = this.isBoundChat(chat.id) ? this._bound()?.botRights : undefined;
    this._groups.updateRights({ ...this._ref(chat), botRights: toGroupBotRights(update.new_chat_member), title: chat.title, topicsEnabled: isForum(chat) });
    if (!before) return;
    const key = String(chat.id);
    const pending = this._pendingRights.get(key);
    if (pending) clearTimeout(pending.timer);
    const timer = setTimeout(() => this._settleRights(key), GROUP_RIGHTS_DEBOUNCE_MS);
    timer.unref();
    this._pendingRights.set(key, { couldManageTopics: pending?.couldManageTopics ?? before.canManageTopics, title: chat.title, timer });
  }

  private _settleRights(key: string) {
    const pending = this._pendingRights.get(key);
    this._pendingRights.delete(key);
    const group = this._bound();
    if (!pending || !group || group.externalId !== key) return;
    const canManageTopics = group.botRights.canManageTopics;
    if (pending.couldManageTopics && !canManageTopics) {
      this._notify({
        source: GROUPS_MODULE,
        type: GROUPS_NOTIFICATION.rightsLost,
        title: '⚠️ У бота забрали право керувати темами, нові топіки не створюються',
        fields: { group: pending.title },
      });
    } else if (!pending.couldManageTopics && canManageTopics) {
      void this._binding.ensureTopics();
    }
  }

  private _bound(): GroupChatEntity | null {
    const group = this._groups.boundGroup();
    return group && group.leftAt === null && group.provider === TELEGRAM_GROUPS_MANIFEST.id ? group : null;
  }

  private _ref(chat: GroupChat): GroupRefDto {
    return { provider: TELEGRAM_GROUPS_MANIFEST.id, externalId: String(chat.id) };
  }

  /** Вихід із чату. Не вдалося — наступна спроба не раніше ніж через `GROUP_LEAVE_RETRY_MS`. */
  private async _leave(chatId: number) {
    try {
      await this._client.call((api) => api.leaveChat(chatId));
      this._leaveRetryAt.delete(chatId);
    } catch (error) {
      // Пам'ять обмежена: при масовій атаці найстаріший чат забувається (його подія просто спробує вийти ще раз).
      if (this._leaveRetryAt.size >= GROUP_LEAVE_RETRY_CHATS_LIMIT) this._leaveRetryAt.delete(this._leaveRetryAt.keys().next().value as number);
      this._leaveRetryAt.set(chatId, Date.now() + GROUP_LEAVE_RETRY_MS);
      this._logger.warn(`leaveChat не вдався: ${errorMessage(error)}`);
    }
  }

  /** Нова подія з чужої групи, де бот досі є: повторна спроба вийти, якщо вже час. */
  private async _leaveAgain(chatId: number) {
    if (Date.now() < (this._leaveRetryAt.get(chatId) ?? 0)) return;
    await this._leave(chatId);
  }

  /** Подія групи в реєстр сповіщень: перемикач і формат — справа каналу. */
  private _notify(notification: TelegramNotification) {
    this._notifications.notify(notification);
  }

  /** Запит власнику в приватний чат, з кнопками. Збій лише в лог: стан групи вже записано, його видно в /groups. */
  private async _tellOwner(html: string, keyboard: InlineKeyboardMarkup) {
    const chatId = this._client.ownerId;
    if (chatId === null) return;
    try {
      await this._client.send({ chatId, html, keyboard });
    } catch (error) {
      this._logger.warn(`Повідомлення власнику про групу не надіслано: ${errorMessage(error)}`);
    }
  }

  /** Файл для скрипта Mac: група і топіки, коли сповіщення йдуть у групу; інакше файла немає. */
  private _syncTopicsEnv() {
    const text = formatTelegramTopicsEnv(this._settings.delivery() === 'private' ? null : this._groups.deliveryMap());
    if (text === this._topicsEnv) return;
    try {
      writeTelegramTopicsEnv(telegramTopicsEnvPath(), text);
      this._topicsEnv = text;
    } catch (error) {
      this._logger.warn(`Файл топіків для скрипта не записано: ${errorMessage(error)}`);
    }
  }
}

function isForum(chat: GroupChat): boolean {
  return chat.type === 'supergroup' && chat.is_forum === true;
}

/** Кнопки під запитом власнику: дії `bind` / `leave` модуля «Групи», після них малюється його екран. */
function confirmKeyboard(group: GroupChatEntity): InlineKeyboardMarkup {
  const params = { id: String(group.id) };
  return {
    inline_keyboard: [
      [
        { text: '✅ Прив\'язати', callback_data: encodeAction(GROUPS_MODULE, '', 'bind', params) },
        { text: '🚪 Вийти з групи', callback_data: encodeAction(GROUPS_MODULE, '', 'leave', params) },
      ],
    ],
  };
}
