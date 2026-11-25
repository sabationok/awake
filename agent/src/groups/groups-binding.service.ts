import { Injectable, Logger } from '@nestjs/common';
import { setTimeout as delay } from 'node:timers/promises';
import { TelegramNotificationsService } from '../telegram/notifications';
import { GROUPS_MODULE, GROUPS_TOPIC_CREATE_PAUSE_MS } from './constants/groups-module';
import { GROUPS_NOTIFICATION } from './constants/groups-notifications';
import { GROUPS_STAT } from './constants/groups-stats';
import type { BindGroupDto } from './dto/bind-group.dto';
import type { GroupIdDto } from './dto/group-id.dto';
import type { RecreateGroupTopicDto } from './dto/recreate-group-topic.dto';
import type { GroupChatEntity } from './entities/group-chat.entity';
import { GroupsSettingsService } from './groups-settings.service';
import { GroupsService } from './groups.service';
import { errorMessage } from './helpers/error-message';
import type { GroupTopicsResult } from './types/group-topics-result.types';

/**
 * Кроки «Груп», які ходять у конектор: прив'язка з перевіркою прав, топіки джерел, вихід із групи. Конектора не знає:
 * усе через `GroupProvider` з `GROUP_PROVIDERS`. Джерела сповіщень бере з їх реєстру (він поки що названий
 * Telegram-ним, це відомий борг реєстру, а не залежність від Telegraf).
 */
@Injectable()
export class GroupsBindingService {
  private readonly _logger = new Logger(GroupsBindingService.name);
  /** Топіки створюються по одному: прив'язка і зміна прав можуть прийти одночасно. */
  private _queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly _groups: GroupsService,
    private readonly _notifications: TelegramNotificationsService,
    private readonly _settings: GroupsSettingsService,
  ) {}

  /**
   * Дозволяє публікацію в групу: з попередньої дозвіл знімається (бот у ній лишається), стан нової звіряється з
   * провайдером, створюються топіки джерел. Власник отримує «Публікацію дозволено».
   */
  async bind(dto: BindGroupDto): Promise<GroupTopicsResult> {
    const previous = this._groups.boundGroup();
    if (previous && previous.id !== dto.groupId) this._groups.release();
    this._groups.bind(dto);
    await this.refresh();
    const result = await this.ensureTopics();
    const group = this._groups.boundGroup();
    if (group && group.id !== previous?.id) {
      this._notifications.notify({
        source: GROUPS_MODULE,
        type: GROUPS_NOTIFICATION.bound,
        title: '👥 Публікацію в групу дозволено',
        fields: {
          group: group.title,
          topics: this._groups.topics().length,
          ...(result.failed.length > 0 ? { failed: result.failed.join(', ') } : {}),
          ...(result.blocked !== null ? { blocked: result.blocked } : {}),
        },
      });
    }
    return result;
  }

  /** Назва, теми і права бота прив'язаної групи — з провайдера. Збій лише в лог: лишається знімок із події. */
  async refresh(): Promise<void> {
    try {
      await this.inspect();
    } catch (error) {
      this._logger.warn(`Стан групи не прочитано: ${errorMessage(error)}`);
    }
  }

  /** Те саме, що `refresh`, але збій віддає тому, хто просив («Перевірити права»). Немає групи — нічого. */
  async inspect(): Promise<void> {
    const group = this._groups.boundGroup();
    if (!group || group.leftAt !== null) return;
    const inspection = await this._groups.requireProvider(group.provider).inspect({ chatId: group.externalId });
    this._groups.updateRights({
      provider: group.provider,
      externalId: group.externalId,
      botRights: inspection.botRights,
      topicsEnabled: inspection.topicsEnabled,
      title: inspection.title,
    });
  }

  /** Топік на кожне джерело з увімкненим `topic.<source>`, якого ще немає: послідовно, з паузою, назва — підпис джерела. */
  ensureTopics(): Promise<GroupTopicsResult> {
    return this._serial(() => this._ensureTopics());
  }

  /**
   * Топік джерела видалили в провайдері: старий позначається видаленим і створюється новий. Повертає thread id
   * нового (або того, що вже встигли створити замість `staleThreadId`); null — створити не вдалося.
   */
  recreateTopic(dto: RecreateGroupTopicDto): Promise<number | null> {
    return this._serial(async () => {
      const group = this._groups.boundGroup();
      if (!group) return null;
      const current = this._groups.topics().find((topic) => topic.source === dto.source);
      if (current && current.threadId !== dto.staleThreadId) return current.threadId;
      if (current) this._groups.markTopicDeleted({ groupId: group.id, source: dto.source });
      if (this._groups.topicsBlocker() !== null) return null;
      const label = this._settings.topicSources().find((source) => source.id === dto.source)?.label ?? dto.source;
      return this._createTopic(group, dto.source, label);
    });
  }

  /** Бот виходить із групи (кнопка «Вийти з групи»); рядок лишається з `leftAt`. */
  async leave(dto: GroupIdDto): Promise<void> {
    const group = this._groups.findGroup(dto);
    if (!group) throw new Error(`Group ${dto.groupId} not found`);
    if (group.leftAt === null) await this._groups.requireProvider(group.provider).leave({ chatId: group.externalId });
    this._groups.markRemoved({ provider: group.provider, externalId: group.externalId });
  }

  /** Знімає дозвіл на публікацію; бот лишається в групі і мовчить. */
  release(): GroupChatEntity | null {
    return this._groups.release();
  }

  /** Знімає дозвіл і виходить із групи: повернути її можна лише новим додаванням бота. */
  async unbind(): Promise<GroupChatEntity | null> {
    const group = this._groups.unbind();
    if (!group || group.leftAt !== null) return group;
    try {
      await this._groups.requireProvider(group.provider).leave({ chatId: group.externalId });
    } catch (error) {
      this._logger.warn(`Вийти з відв'язаної групи не вдалося: ${errorMessage(error)}`);
    }
    return group;
  }

  private async _ensureTopics(): Promise<GroupTopicsResult> {
    const result: GroupTopicsResult = { created: [], failed: [], blocked: this._groups.topicsBlocker() };
    const group = this._groups.boundGroup();
    if (!group || result.blocked !== null) return result;
    this._groups.requireCapability({ provider: group.provider, capability: 'topics' });
    const existing = new Set(this._groups.topics().map((topic) => topic.source));
    const missing = this._settings.topicSources().filter((source) => !existing.has(source.id) && this._settings.topicEnabled(source.id));
    for (const [index, source] of missing.entries()) {
      if (index > 0) await delay(GROUPS_TOPIC_CREATE_PAUSE_MS);
      const threadId = await this._createTopic(group, source.id, source.label);
      (threadId === null ? result.failed : result.created).push(source.id);
    }
    return result;
  }

  private async _createTopic(group: GroupChatEntity, source: string, name: string): Promise<number | null> {
    try {
      const { threadId } = await this._groups.requireProvider(group.provider).ensureTopic({ chatId: group.externalId, source, name });
      this._groups.saveTopic({ groupId: group.id, threadId, source, name });
      this._groups.count(GROUPS_STAT.topicCreated);
      return threadId;
    } catch (error) {
      this._logger.warn(`Топік «${name}» не створено: ${errorMessage(error)}`);
      return null;
    }
  }

  private _serial<T>(run: () => Promise<T>): Promise<T> {
    const next = this._queue.then(run, run);
    this._queue = next.catch(() => undefined);
    return next;
  }
}
