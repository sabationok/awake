import { Injectable } from '@nestjs/common';
import type { GroupProviderManifest, SettingDefinition, SettingValue, UiPage } from '@awake/contracts';
import type { MacModule, ModuleContext, StatusFields } from '../modules/types/mac-module';
import { StatsService } from '../stats';
import { GROUPS_MODULE } from './constants/groups-module';
import { GROUPS_UI_NOTIFICATIONS } from './constants/groups-notifications';
import { GROUPS_COMMANDS_KEY } from './constants/groups-settings';
import { GROUPS_UI_STATS } from './constants/groups-stats';
import { GroupsBindingService } from './groups-binding.service';
import { GroupsSettingsService } from './groups-settings.service';
import { GroupsService } from './groups.service';
import { capabilityReason } from './helpers/capability-reason';
import { groupTopicRows } from './helpers/group-topic-rows';
import { groupsTopicSettingSource } from './helpers/groups-topic-setting';
import { buildGroupsListPage } from './pages/groups-list-page';
import { buildGroupsPage } from './pages/groups-page';
import { buildGroupsStatsPage } from './pages/groups-stats-page';
import { buildGroupsTopicsPage } from './pages/groups-topics-page';
import type { GroupsPageView } from './types/groups-page-view.types';

/**
 * Маніфест модуля «Групи»: сповіщення агента MaControl по топіках прив'язаної групи. Ядро нейтральне до провайдера
 * (окремий модуль), а в меню сторінки стоять під своїм провайдером (`parent`), бо група — це група в Telegram.
 * Що вміє конектор, сторінки читають з його маніфесту (`GroupsService.supports`) і нічого не питають у нього по ходу.
 */
@Injectable()
export class GroupsMacModule implements MacModule {
  readonly id = GROUPS_MODULE;
  readonly title = 'Групи';
  /** Єдиний провайдер груп зараз — Telegram; з другим провайдером це піде з маніфесту конектора. */
  readonly parent = 'telegram';
  readonly description = 'Сповіщення агента MaControl по топіках групи, в яку ви дозволили публікацію. Зараз — Telegram.';
  readonly icon = { symbol: 'person.3.fill', tone: 'accent' } as const;
  // Mac модулю нічого не дає.
  readonly permissions: MacModule['permissions'] = [];
  readonly notifications = GROUPS_UI_NOTIFICATIONS;
  readonly stats = GROUPS_UI_STATS;

  constructor(
    private readonly _groups: GroupsService,
    private readonly _binding: GroupsBindingService,
    private readonly _settings: GroupsSettingsService,
    private readonly _stats: StatsService,
  ) {}

  /** Статичні налаштування і `topic.<source>` на кожне джерело сповіщень: нове джерело одразу отримує перемикач. */
  get settings(): SettingDefinition[] {
    return this._settings.definitions();
  }

  pages(ctx: ModuleContext): UiPage[] {
    const view = this._view();
    return [
      buildGroupsPage(ctx, view),
      buildGroupsListPage(view),
      buildGroupsTopicsPage(ctx, view),
      buildGroupsStatsPage(ctx, (namespace, { granularity, from, to }) => this._stats.timeline({ namespace, granularity, from, to })),
    ];
  }

  /** Без Telegram-бота модуль не має чим ні слухати групу, ні писати в неї: сірий пункт меню, не схований. */
  disabled(ctx: ModuleContext): string | null {
    return ctx.setting<boolean>('bot', 'telegram') ? null : 'Telegram-бот вимкнено';
  }

  status(): StatusFields | null {
    const group = this._groups.boundGroup();
    return { group: group?.title ?? null, delivery: this._settings.delivery(), topics: group ? this._groups.topics().length : null };
  }

  /** Незадекларовану конектором можливість увімкнути не можна: її ніхто не викличе. */
  rejectSetting(key: string, value: SettingValue): string | null {
    if (value !== true) return null;
    const provider = this._provider();
    if (key === GROUPS_COMMANDS_KEY && !this._groups.supports(provider.id, 'commands')) return capabilityReason(provider, 'commands');
    if (groupsTopicSettingSource(key) !== null && !this._groups.supports(provider.id, 'topics')) return capabilityReason(provider, 'topics');
    return null;
  }

  /** Джерелу ввімкнули свій топік: створюємо його одразу, якщо група це дозволяє. Меню команд і файл топіків оновлює конектор. */
  onSettingChanged(key: string, value: SettingValue) {
    if (groupsTopicSettingSource(key) === null || value !== true) return;
    if (this._groups.topicsBlocker() === null) void this._binding.ensureTopics().catch(() => undefined);
  }

  private _view(): GroupsPageView {
    const group = this._groups.boundGroup();
    const provider = this._provider();
    return {
      group,
      pending: this._groups.pendingGroups(),
      inactive: this._groups.inactiveGroups(),
      topicsBlocker: this._groups.topicsBlocker(),
      provider,
      supports: (capability) => this._groups.supports(provider.id, capability),
      rows: groupTopicRows(this._settings.topicSources(), this._groups.topics(), (source) => this._settings.topicEnabled(source)),
    };
  }

  /** Конектор прив'язаної групи, а без групи — перший зареєстрований (зараз він один). */
  private _provider(): GroupProviderManifest {
    const group = this._groups.boundGroup();
    return group ? this._groups.requireProvider(group.provider).manifest : this._groups.manifests()[0];
  }
}
