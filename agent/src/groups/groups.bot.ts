import { HttpStatus } from '@nestjs/common';
import { Bot, BotAction, BotParams, BotScreen, BotVia, type BotMenu, type BotParamValue, type BotViaInfo } from '../bot';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { escapeHtml } from '../common/escape-html';
import { MACONTROL_BOT } from '../modules/constants/macontrol-bot';
import { GROUPS_MODULE } from './constants/groups-module';
import type { GroupChatEntity } from './entities/group-chat.entity';
import { GroupsBindingService } from './groups-binding.service';
import { GroupsSettingsService } from './groups-settings.service';
import { GroupsService } from './groups.service';
import { capabilityReason } from './helpers/capability-reason';
import { errorMessage } from './helpers/error-message';
import { groupTopicRows, groupTopicStateText } from './helpers/group-topic-rows';
import type { GroupsDeliveryMode } from './types/groups-delivery.types';

const DELIVERY_LABEL: Record<GroupsDeliveryMode, string> = {
  private: 'у приватний чат',
  group: 'у групу',
  both: 'у приватний чат і в групу',
};

const mark = (ok: boolean) => (ok ? '✓' : '✗');

/** `staleThreadId` для джерела без топіка: thread id провайдера завжди додатний. */
const NO_THREAD = -1;

/** Скільки символів назви групи вміщається на кнопці поруч із дією. */
const BUTTON_TITLE_MAX = 16;

/**
 * /groups: група з дозволом на публікацію, її топіки, список груп без дозволу і адмін-дії. Дії приймаються з приватного чату власника, з Mac і з
 * локального Web UI; з групового чату і через проксі — відмова.
 */
@Bot(MACONTROL_BOT, { namespace: GROUPS_MODULE, command: 'groups', description: '👥 Групи' })
export class GroupsBot {
  constructor(
    private readonly _groups: GroupsService,
    private readonly _binding: GroupsBindingService,
    private readonly _settings: GroupsSettingsService,
  ) {}

  /**
   * «Дозволити публікацію»: група з `id` стає групою сповіщень (з попередньої дозвіл знімається, бот у ній
   * лишається), далі звірка прав і топіки джерел.
   */
  @BotAction('bind')
  async bind(@BotParams('id') id: BotParamValue | undefined, @BotVia() via: BotViaInfo) {
    assertAdminPath(via);
    await this._binding.bind({ groupId: this._pending(id).id });
  }

  /** «Заборонити публікацію»: дозвіл знімається, бот лишається в групі і мовчить. */
  @BotAction('release')
  release(@BotVia() via: BotViaInfo) {
    assertAdminPath(via);
    if (!this._binding.release()) throw refuse('Публікацію не дозволено в жодну групу');
  }

  /** «Вийти з групи»: бот виходить із групи без дозволу на публікацію. */
  @BotAction('leave')
  async leave(@BotParams('id') id: BotParamValue | undefined, @BotVia() via: BotViaInfo) {
    assertAdminPath(via);
    await this._binding.leave({ groupId: this._pending(id).id });
  }

  @BotAction('unbind')
  async unbind(@BotVia() via: BotViaInfo) {
    assertAdminPath(via);
    await this._binding.unbind();
  }

  /** Створює топіки джерел, яких ще немає (нове джерело, видалений топік, права дали пізніше). */
  @BotAction('ensureTopics')
  async ensureTopics(@BotVia() via: BotViaInfo) {
    assertAdminPath(via);
    const group = this._groups.boundGroup();
    // Конектор без топіків: відмова з причиною, провайдер не викликається.
    if (group && !this._groups.supports(group.provider, 'topics')) throw refuse(capabilityReason(this._groups.requireProvider(group.provider).manifest, 'topics'));
    await this._binding.refresh();
    const { blocked } = await this._binding.ensureTopics();
    if (blocked !== null) throw refuse(blocked);
  }

  /** «Перевірити права»: назва, теми і права бота прив'язаної групи читаються з провайдера заново. */
  @BotAction('checkRights')
  async checkRights(@BotVia() via: BotViaInfo) {
    assertAdminPath(via);
    const group = this._groups.boundGroup();
    if (!group) throw refuse('Публікацію не дозволено в жодну групу');
    if (group.leftAt !== null) throw refuse('Бот вийшов із групи');
    try {
      await this._binding.inspect();
    } catch (error) {
      throw refuse(`Стан групи не прочитано: ${errorMessage(error)}`);
    }
  }

  /**
   * «Створити заново»: новий топік джерела `source` замість поточного (або перший, якщо топіка ще немає). Старий
   * топік у провайдері не видаляється. Конектор без топіків — відмова, провайдер не викликається.
   */
  @BotAction('recreateTopic')
  async recreateTopic(@BotParams('source') requested: BotParamValue | undefined, @BotVia() via: BotViaInfo) {
    assertAdminPath(via);
    const group = this._groups.boundGroup();
    if (!group) throw refuse('Публікацію не дозволено в жодну групу');
    const source = this._settings.topicSources().find((item) => item.id === String(requested));
    if (!source) throw refuse('Такого джерела сповіщень немає');
    if (!this._groups.supports(group.provider, 'topics')) throw refuse(capabilityReason(this._groups.requireProvider(group.provider).manifest, 'topics'));
    if (!this._settings.topicEnabled(source.id)) throw refuse(`Топік джерела «${source.label}» вимкнено`);
    await this._binding.refresh();
    const blocker = this._groups.topicsBlocker();
    if (blocker !== null) throw refuse(blocker);
    const current = this._groups.topics().find((topic) => topic.source === source.id);
    // Без поточного топіка `staleThreadId` ні з чим не збігається: створюється перший.
    const threadId = await this._binding.recreateTopic({ source: source.id, staleThreadId: current?.threadId ?? NO_THREAD });
    if (threadId === null) throw refuse(`Топік «${source.label}» не створено`);
  }

  @BotScreen()
  main(): BotMenu {
    const group = this._groups.boundGroup();
    const pending = this._groups.pendingGroups();
    const lines = ['<b>👥 Групи</b>'];
    const buttons: BotMenu['buttons'] = [];
    if (group) {
      const rights = group.botRights;
      lines.push(
        `Група: <b>${escapeHtml(group.title)}</b>${group.leftAt !== null ? ' (бот вийшов)' : ''}`,
        `Теми ${mark(group.topicsEnabledAt !== null)} · адмін ${mark(rights.isAdmin)} · керування темами ${mark(rights.canManageTopics)} · видалення ${mark(rights.canDeleteMessages)}`,
        `Сповіщення: ${DELIVERY_LABEL[this._settings.delivery()]} · команди в групі: ${this._settings.commands() ? 'так' : 'ні'}`,
        '',
        '<b>Топіки</b>',
        ...groupTopicRows(this._settings.topicSources(), this._groups.topics(), (source) => this._settings.topicEnabled(source)).map(
          (row) => `• ${escapeHtml(row.label)} — ${groupTopicStateText(row)}`,
        ),
      );
      const blocker = this._groups.topicsBlocker();
      if (blocker) lines.push('', `⚠️ ${escapeHtml(blocker)}`);
      buttons.push(
        [
          { label: '🔎 Перевірити права', action: 'checkRights' },
          { label: '🧵 Створити топіки', action: 'ensureTopics' },
        ],
        [
          { label: '⏸ Заборонити публікацію', action: 'release' },
          { label: '🚪 Вийти з групи', action: 'unbind' },
        ],
      );
    } else {
      lines.push(
        'Публікацію не дозволено в жодну групу: сповіщення йдуть у приватний чат.',
        'Створіть супергрупу, увімкніть у ній теми і додайте бота адміном з правом керувати темами. Група з\'явиться тут; бот у ній нічого не робить, поки ви не дозволите публікацію.',
      );
    }
    const list = (title: string, items: GroupChatEntity[], allow: string) => {
      if (items.length === 0) return;
      lines.push('', `<b>${title}</b>`);
      for (const item of items) {
        const params = { id: String(item.id) };
        // Назва на кнопці: у двох списках однакові номери плутались би.
        const name = item.title.length > BUTTON_TITLE_MAX ? `${item.title.slice(0, BUTTON_TITLE_MAX)}…` : item.title;
        lines.push(`• ${escapeHtml(item.title)} (додав <code>${escapeHtml(item.addedBy)}</code>)`);
        buttons.push([
          { label: `✅ ${allow}: ${name}`, action: 'bind', params },
          { label: `🚪 Вийти: ${name}`, action: 'leave', params },
        ]);
      }
    };
    list('Запити (не підтверджені)', pending, 'Дозволити');
    list('Неактивні', this._groups.inactiveGroups(), 'Активувати');
    return { text: lines.join('\n'), buttons };
  }

  /**
   * Група з кнопки «Дозволити публікацію» / «Вийти з групи»: запит або неактивна, і бот має бути в ній. Стара кнопка під давнім рядком не чіпає групу з дозволом: у неї свої кнопки.
   */
  private _pending(id: BotParamValue | undefined): GroupChatEntity {
    const groupId = Number(id);
    const group = Number.isInteger(groupId) ? this._groups.findGroup({ groupId }) : null;
    if (!group) throw refuse('Групи вже немає в списку');
    if (group.boundAt !== null) throw refuse(`У «${group.title}» публікацію вже дозволено: ця кнопка застаріла`);
    if (group.leftAt !== null) throw refuse('Бот уже вийшов із цієї групи');
    return group;
  }
}

function refuse(message: string): AppException {
  return new AppException(API_ERROR_CODES.invalidCommand, message);
}

/** Адмін-дії не приймаються з групового чату і через проксі (Vercel, tailnet): лише приватний чат, Mac, локальний Web UI. */
function assertAdminPath(via: BotViaInfo) {
  if (via.group === undefined && via.proxy === undefined) return;
  throw new AppException(API_ERROR_CODES.invalidCommand, 'Ця дія доступна лише в приватному чаті з ботом, на Mac або в локальному Web UI', HttpStatus.FORBIDDEN);
}
