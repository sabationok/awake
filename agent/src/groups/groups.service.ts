import { Inject, Injectable } from '@nestjs/common';
import type { GroupCapability, GroupProviderId, GroupProviderManifest } from '@awake/contracts';
import { Subject } from 'rxjs';
import { StatsService } from '../stats';
import { GROUP_PROVIDERS } from './constants/group-providers';
import { GROUPS_FOREIGN_ROWS_LIMIT } from './constants/groups-limits';
import { GROUPS_EVENTS_STAT_NS, GROUPS_STAT, GROUPS_STAT_STATUS, type GroupsStatKey } from './constants/groups-stats';
import type { BindGroupDto } from './dto/bind-group.dto';
import type { CreateGroupChatDto } from './dto/create-group-chat.dto';
import type { GroupCapabilityDto } from './dto/group-capability.dto';
import type { GroupIdDto } from './dto/group-id.dto';
import type { GroupRefDto } from './dto/group-ref.dto';
import type { GroupTopicRefDto } from './dto/group-topic-ref.dto';
import type { RegisterGroupAddedDto } from './dto/register-group-added.dto';
import type { SaveGroupTopicDto } from './dto/save-group-topic.dto';
import type { UpdateGroupChatStateDto } from './dto/update-group-chat-state.dto';
import type { UpdateGroupRightsDto } from './dto/update-group-rights.dto';
import type { GroupChatEntity } from './entities/group-chat.entity';
import type { GroupTopicEntity } from './entities/group-topic.entity';
import { GroupsSettingsService } from './groups-settings.service';
import type { FindOneGroupTopicQuery } from './query/find-one-group-topic.query';
import { FindBoundGroupChatQuery } from './query/find-bound-group-chat.query';
import { GroupChatsRepository } from './repositories/group-chats.repository';
import { GroupTopicsRepository } from './repositories/group-topics.repository';
import type { GroupAddedDecision } from './types/group-added-decision.types';
import type { GroupDeliveryMap } from './types/group-delivery-map.types';
import type { GroupProvider, GroupTarget } from './types/group-provider.types';

/** Кеш прив'язаної групи і мапи `source → threadId`; скидається на кожен запис. */
interface BoundSnapshot {
  group: GroupChatEntity | null;
  threads: Map<string, number>;
}

/**
 * Ядро модуля «Групи», без знання про конкретного провайдера: яка група прив'язана для сповіщень, який топік
 * якому джерелу належить, куди слати сповіщення джерела. Прив'язана група одна. Про те, слати в приват, групу чи
 * обидва, ядро не вирішує: `resolveTargets` каже лише, де саме в групі.
 */
@Injectable()
export class GroupsService {
  /** Будь-який запис у групи чи топіки: конектор оновлює своє (меню команд групи, файл топіків для скрипта). */
  readonly changed$ = new Subject<void>();
  private _snapshot: BoundSnapshot | null = null;

  constructor(
    private readonly _chats: GroupChatsRepository,
    private readonly _topics: GroupTopicsRepository,
    @Inject(GROUP_PROVIDERS) private readonly _providers: GroupProvider[],
    private readonly _settings: GroupsSettingsService,
    private readonly _stats: StatsService,
  ) {}

  /** Лічильник події модуля в `groups.events`. Єдине місце запису: ключ — лише задекларований у `GROUPS_UI_STATS`. */
  count(event: GroupsStatKey): void {
    this._stats.increment({ namespace: GROUPS_EVENTS_STAT_NS, metrics: { [event]: { [GROUPS_STAT_STATUS]: 1 } } });
  }

  /**
   * Бота додали в групу. Додав власник: рядок з `requestedAt`, рішення `confirm` (спитати «Прив'язати?»).
   * Додав хтось інший: рядок з `leftAt` для журналу, рішення `leave` (конектор виходить з групи); таких рядків
   * тримається не більше `GROUPS_FOREIGN_ROWS_LIMIT`. Відв'язана раніше група повертається без прив'язки.
   */
  registerAdded(dto: RegisterGroupAddedDto): GroupAddedDecision {
    const now = new Date().toISOString();
    const topicsEnabledAt = dto.topicsEnabled ? now : null;
    const ref: GroupRefDto = { provider: dto.provider, externalId: dto.externalId };
    // Живий рядок групи один (унікальний індекс); якщо його немає — останній відв'язаний, його й відновлюємо.
    const existing = this._chats.findOne(ref) ?? this._chats.findOne(ref, { withDeleted: true, order: { id: 'DESC' } });
    const state: UpdateGroupChatStateDto = {
      title: dto.title,
      addedBy: dto.addedBy,
      botRights: dto.botRights,
      topicsEnabledAt,
      leftAt: dto.byOwner ? null : now,
    };
    let id: number;
    if (existing) {
      id = existing.id;
      // Прив'язаною лишається тільки жива прив'язана група. Відв'язаний рядок відновлюється без прив'язки (і старі
      // рядки, відв'язані ще з `boundAt`, теж): власник знову отримує «Прив'язати?».
      const bound = existing.deletedAt === null && existing.boundAt !== null;
      if (existing.deletedAt !== null) this._chats.restore({ id });
      this._chats.update({ id }, { ...state, boundAt: bound ? existing.boundAt : null, requestedAt: dto.byOwner && !bound ? now : null });
    } else {
      const create: CreateGroupChatDto = {
        provider: dto.provider,
        externalId: dto.externalId,
        title: dto.title,
        addedBy: dto.addedBy,
        botRights: dto.botRights,
        topicsEnabledAt,
        requestedAt: dto.byOwner ? now : null,
        leftAt: dto.byOwner ? null : now,
      };
      id = this._chats.create(create).id;
    }
    if (!dto.byOwner) this._purgeForeign();
    this._invalidate();
    if (!dto.byOwner) this.count(GROUPS_STAT.foreignLeft);
    return { action: dto.byOwner ? 'confirm' : 'leave', group: this._chats.findOneOrFail({ id }) };
  }

  /** Прив'язує групу для сповіщень. Лише одна: нова — після `unbind`. */
  bind(dto: BindGroupDto): GroupChatEntity {
    const group = this._chats.findOne({ id: dto.groupId });
    if (!group) throw new Error(`Group ${dto.groupId} not found`);
    if (group.boundAt !== null) return group;
    if (group.leftAt !== null) throw new Error(`Bot has left group ${dto.groupId}`);
    const other = this._findBound();
    if (other) throw new Error(`Group ${other.id} is already bound; unbind it first`);
    this._chats.update({ id: group.id }, { boundAt: new Date().toISOString(), requestedAt: null });
    this._invalidate();
    return this._chats.findOneOrFail({ id: group.id });
  }

  /**
   * Відв'язує групу: прив'язка і запит знімаються (`boundAt`, `requestedAt`), рядок і його топіки soft-deleted.
   * Повертає групу, якою вона була до відв'язки (конектор може вийти з неї), або null.
   */
  unbind(): GroupChatEntity | null {
    const group = this._findBound();
    if (!group) return null;
    this._topics.delete({ groupId: group.id });
    // Спершу стан, потім soft delete: видалений рядок `update` уже не чіпає.
    this._chats.update({ id: group.id }, { boundAt: null, requestedAt: null });
    this._chats.delete({ id: group.id });
    this._invalidate();
    return group;
  }

  /** Бот вийшов із групи або його видалили. Прив'язка лишається (її знімає `unbind`), але адресатів не буде. */
  markRemoved(dto: GroupRefDto): void {
    const group = this._chats.findOne({ provider: dto.provider, externalId: dto.externalId });
    if (!group || group.leftAt !== null) return;
    this._chats.update({ id: group.id }, { leftAt: new Date().toISOString() });
    this._invalidate();
  }

  /** Нові права, назва або стан тем з події конектора чи `inspect`. */
  updateRights(dto: UpdateGroupRightsDto): void {
    const group = this._chats.findOne({ provider: dto.provider, externalId: dto.externalId });
    if (!group) return;
    const state: UpdateGroupChatStateDto = { botRights: dto.botRights };
    if (dto.title !== undefined) state.title = dto.title;
    if (dto.topicsEnabled !== undefined) state.topicsEnabledAt = dto.topicsEnabled ? (group.topicsEnabledAt ?? new Date().toISOString()) : null;
    this._chats.update({ id: group.id }, state);
    this._invalidate();
  }

  /** Прив'язана група (також якщо бот з неї вийшов) або null. */
  boundGroup(): GroupChatEntity | null {
    return this._load().group;
  }

  /** Живі топіки прив'язаної групи. */
  topics(): GroupTopicEntity[] {
    const group = this._load().group;
    return group ? this._topics.findMany({ groupId: group.id }, { order: { id: 'ASC' } }) : [];
  }

  /** Група за id рядка (не відв'язана) або null. */
  findGroup(dto: GroupIdDto): GroupChatEntity | null {
    return this._chats.findOne({ id: dto.groupId });
  }

  /** Чи ядро знає цю групу як таку, де бот зараз є (зареєстрована і бот з неї не вийшов). */
  isKnownGroup(dto: GroupRefDto): boolean {
    const group = this._chats.findOne({ provider: dto.provider, externalId: dto.externalId });
    return group !== null && group.leftAt === null;
  }

  /**
   * Чужа група: рядок для журналу, з якого бот вийшов (або мав вийти) і який власник не просив і не прив'язував.
   * Конектор за цим не починає «додали» заново на кожну подію з такого чату.
   */
  isForeignGroup(dto: GroupRefDto): boolean {
    const group = this._chats.findOne({ provider: dto.provider, externalId: dto.externalId });
    return group !== null && group.leftAt !== null && group.requestedAt === null && group.boundAt === null;
  }

  /** Групи, куди бота додав власник і які чекають «Прив'язати»: бот у них, прив'язки немає. */
  pendingGroups(): GroupChatEntity[] {
    return this._chats.findMany({ requested: true, bound: false, left: false }, { order: { id: 'ASC' } });
  }

  /** Чому в прив'язаній групі зараз не можна створювати топіки; null — можна. */
  topicsBlocker(): string | null {
    const group = this._load().group;
    if (!group) return 'Групу не прив\'язано';
    if (group.leftAt !== null) return 'Бот вийшов із групи';
    if (group.topicsEnabledAt === null) return 'У групі не ввімкнені теми';
    if (!group.botRights.canManageTopics) return 'Бот не має права керувати темами';
    return null;
  }

  /**
   * Чат і живі топіки прив'язаної групи для тих, хто шле сам (скрипт Mac); null — слати в групу зараз нікуди.
   * Джерела з вимкненим `topic.<source>` у мапу не потрапляють.
   */
  deliveryMap(): GroupDeliveryMap | null {
    const { group, threads } = this._load();
    if (!group || group.leftAt !== null || group.topicsEnabledAt === null) return null;
    const enabled = [...threads].filter(([source]) => this._settings.topicEnabled(source));
    return { provider: group.provider, chatId: group.externalId, threads: Object.fromEntries(enabled) };
  }

  /** Запам'ятовує топік джерела: новий або оновлює існуючий (інший thread id, назва, знову відкритий). */
  saveTopic(dto: SaveGroupTopicDto): GroupTopicEntity {
    const existing = this._topics.findOne({ groupId: dto.groupId, source: dto.source });
    if (existing) this._topics.update({ id: existing.id }, { threadId: dto.threadId, name: dto.name, closedAt: null });
    else this._topics.create({ groupId: dto.groupId, threadId: dto.threadId, source: dto.source, name: dto.name, closedAt: null });
    this._invalidate();
    return this._topics.findOneOrFail({ groupId: dto.groupId, source: dto.source });
  }

  /** Топік видалили (в провайдері або ми): soft delete; адресат джерела перестає мати thread. */
  markTopicDeleted(dto: GroupTopicRefDto): void {
    this._topics.delete(this._topicQuery(dto));
    this._invalidate();
  }

  markTopicClosed(dto: GroupTopicRefDto): void {
    this._topics.update(this._topicQuery(dto), { closedAt: new Date().toISOString() });
    this._invalidate();
  }

  markTopicReopened(dto: GroupTopicRefDto): void {
    this._topics.update(this._topicQuery(dto), { closedAt: null });
    this._invalidate();
  }

  /**
   * Куди слати сповіщення джерела в прив'язаній групі. Порожньо, коли групи немає, бот вийшов або в групі не
   * ввімкнені теми. Право керувати темами тут не потрібне: воно блокує лише створення топіків (`topicsBlocker`),
   * а писати в наявний топік можна й без нього. Є група, але немає топіка джерела або його перемикач
   * `topic.<source>` вимкнений — адресат без `threadId` (загальна стрічка групи). Закритий топік лишається
   * адресатом: чи писати в нього, вирішує конектор.
   */
  resolveTargets(source: string): GroupTarget[] {
    const { group, threads } = this._load();
    if (!group || group.leftAt !== null || group.topicsEnabledAt === null) return [];
    const threadId = this._settings.topicEnabled(source) ? threads.get(source) : undefined;
    return [threadId === undefined ? { provider: group.provider, chatId: group.externalId } : { provider: group.provider, chatId: group.externalId, threadId }];
  }

  /** Конектор за id. Немає зареєстрованого — помилка. */
  requireProvider(id: GroupProviderId): GroupProvider {
    const provider = this._providers.find((item) => item.manifest.id === id);
    if (!provider) throw new Error(`Group provider "${id}" is not registered`);
    return provider;
  }

  /** Конектор, який задекларував можливість у маніфесті. Незадекларована — помилка, не тихий успіх. */
  requireCapability(dto: GroupCapabilityDto): GroupProvider {
    const provider = this.requireProvider(dto.provider);
    if (!this.supports(dto.provider, dto.capability)) throw new Error(`Group provider "${dto.provider}" does not declare "${dto.capability}"`);
    return provider;
  }

  /** Маніфести зареєстрованих конекторів, у порядку реєстрації. */
  manifests(): GroupProviderManifest[] {
    return this._providers.map((provider) => provider.manifest);
  }

  /** Чи задекларував конектор можливість (для сірих елементів на сторінках). Читає маніфест, провайдера не викликає. */
  supports(provider: GroupProviderId, capability: GroupCapability): boolean {
    return this._providers.find((item) => item.manifest.id === provider)?.manifest.capabilities.includes(capability) ?? false;
  }

  private _topicQuery(dto: GroupTopicRefDto): FindOneGroupTopicQuery {
    if (dto.source === undefined && dto.threadId === undefined) throw new Error('Topic ref needs source or threadId');
    return { groupId: dto.groupId, source: dto.source, threadId: dto.threadId };
  }

  private _load(): BoundSnapshot {
    if (this._snapshot) return this._snapshot;
    const group = this._findBound();
    const threads = new Map<string, number>();
    if (group) for (const topic of this._topics.findMany({ groupId: group.id })) threads.set(topic.source, topic.threadId);
    this._snapshot = { group, threads };
    return this._snapshot;
  }

  /** Прив'язана група. Унікальний індекс лишає одну; порядок за id робить вибір однозначним і без нього. */
  private _findBound(): GroupChatEntity | null {
    return this._chats.findOne(new FindBoundGroupChatQuery(), { order: { id: 'ASC' } });
  }

  /** Рядків чужих груп не більше `GROUPS_FOREIGN_ROWS_LIMIT`: найстаріші з тих, де бота вже немає і прив'язки не було, видаляються. */
  private _purgeForeign() {
    const stale = this._chats.findMany(
      { left: true, bound: false, requested: false, pagination: { limit: GROUPS_FOREIGN_ROWS_LIMIT, offset: GROUPS_FOREIGN_ROWS_LIMIT } },
      { order: { leftAt: 'DESC', id: 'DESC' } },
    );
    for (const row of stale) this._chats.hardDelete({ id: row.id });
  }

  private _invalidate() {
    this._snapshot = null;
    this.changed$.next();
  }
}
