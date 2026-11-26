import type { GroupBotRights, UiItem, UiNode, UiPage } from '@awake/contracts';
import { menuItem } from '../../modules/helpers/menu-item';
import type { ModuleContext } from '../../modules/types/mac-module';
import { GROUP_CAPABILITY_LABEL } from '../constants/groups-capabilities';
import { GROUPS_MODULE, GROUPS_PAGE } from '../constants/groups-module';
import { GROUPS_COMMANDS_KEY, GROUPS_DELIVERY_KEY, GROUPS_FALLBACK_PRIVATE_KEY } from '../constants/groups-settings';
import { capabilityReason } from '../helpers/capability-reason';
import { withSettingState } from '../helpers/with-setting-state';
import type { GroupsPageView } from '../types/groups-page-view.types';

const action = (name: string, params?: Record<string, string>) => ({ module: GROUPS_MODULE, name, ...(params ? { params } : {}) });

/**
 * «Групи»: група з дозволом на публікацію, список груп без дозволу, права бота з тим, що дає кожне, налаштування доставки і адмін-кнопки. Те, чого конектор
 * не задекларував у маніфесті, видно сірим з причиною і не викликається.
 */
export function buildGroupsPage(ctx: ModuleContext, view: GroupsPageView): UiPage {
  const { group, provider } = view;
  const online = group !== null && group.leftAt === null;
  const topics = view.supports('topics');
  const commands = view.supports('commands');
  // Чому кнопки групи зараз сірі; null — працюють.
  const offline = !group ? 'Публікацію не дозволено в жодну групу' : !online ? 'Бот вийшов із групи' : null;
  const topicsReason = offline ?? (topics ? null : capabilityReason(provider, 'topics'));

  // Стан групи і її дії в одній картці; запити — окремі картки з дією на кожен.
  const binding: UiNode[] = [
    {
      id: 'groups-state',
      type: 'item',
      title: group ? group.title : 'Публікацію не дозволено в жодну групу',
      status: {
        label: group ? (view.topicsBlocker ?? 'Сповіщення йдуть у топіки групи') : 'Сповіщення йдуть у приватний чат',
        tone: !online ? 'gray' : view.topicsBlocker ? 'orange' : 'green',
      },
      actions: [
        menuItem('groups-check-rights', 'Перевірити права', action('checkRights'), { disabled: offline !== null }),
        menuItem('groups-ensure-topics', 'Створити топіки', action('ensureTopics'), { variant: 'accent', disabled: topicsReason !== null }),
        menuItem('groups-release', 'Заборонити публікацію', action('release'), { disabled: group === null }),
        menuItem('groups-unbind', 'Вийти з групи', action('unbind'), {
          variant: 'danger',
          disabled: group === null,
          confirm: {
            title: 'Вийти з групи?',
            text: 'Сповіщення підуть у приватний чат, повернути групу можна лише новим додаванням бота.',
            ok: 'Вийти',
          },
        }),
      ],
    },
    ...(topicsReason !== null && offline === null ? [{ id: 'groups-buttons-reason', type: 'text', text: topicsReason, tone: 'gray' } satisfies UiNode] : []),
    ...view.pending.map((item): UiNode => {
      const params = { id: String(item.id) };
      return {
        id: `groups-pending-${item.id}`,
        type: 'item',
        title: item.title,
        status: { label: 'Запит', tone: 'orange' },
        comment: `бот у групі нічого не робить · додав ${item.addedBy}`,
        actions: [
          // Група з дозволом одна: з попередньої він знімається, бот у ній лишається.
          menuItem(`groups-bind-${item.id}`, 'Дозволити публікацію', action('bind', params), { variant: 'accent' }),
          menuItem(`groups-leave-${item.id}`, 'Вийти з групи', action('leave', params)),
        ],
      };
    }),
  ];

  return {
    id: GROUPS_PAGE,
    module: GROUPS_MODULE,
    title: 'Групи',
    icon: { symbol: 'person.3.fill', tone: 'accent' },
    group: 'modules',
    // Прив'язка і топіки — справа адміна: через Vercel їх не віддаємо.
    scope: 'local',
    children: [
      {
        id: 'groups-binding',
        type: 'section',
        title: 'Куди публікувати',
        footer:
          'Додайте бота адміном у супергрупу з увімкненими темами: вона з\'явиться тут. Бот у групі нічого не робить, поки ви не дозволите публікацію; дозволена група одна. Усі групи за станом — на вкладці «Список груп». Те саме — командою /groups у приватному чаті з ботом.',
        children: binding,
      },
      {
        id: 'groups-rights',
        type: 'section',
        title: 'Права бота',
        footer: group ? 'Знімок з останньої події групи. «Перевірити права» читає його з провайдера заново.' : 'З\'являться, коли дозволите публікацію в групу.',
        children: rightsRows(view),
      },
      {
        id: 'groups-delivery',
        type: 'section',
        title: 'Доставка',
        footer: 'Запасний приватний чат спрацьовує, коли відправка в групу не вдалась. Якщо групи немає зовсім, сповіщення йдуть у приватний чат завжди.',
        children: [
          ctx.settingNode(GROUPS_DELIVERY_KEY),
          ctx.settingNode(GROUPS_FALLBACK_PRIVATE_KEY),
          withSettingState(ctx.settingNode(GROUPS_COMMANDS_KEY), commands ? {} : { disabled: true, hint: capabilityReason(provider, 'commands') }),
        ],
      },
      {
        id: 'groups-capabilities',
        type: 'section',
        title: `Конектор ${provider.title}`,
        footer: `Ліміт провайдера: ${provider.limits.messagesPerMinute} повідомлень на хвилину в одну групу.`,
        children: [
          {
            id: 'groups-capabilities-list',
            type: 'list',
            items: (Object.keys(GROUP_CAPABILITY_LABEL) as (keyof typeof GROUP_CAPABILITY_LABEL)[]).map((capability) => ({
              id: capability,
              label: GROUP_CAPABILITY_LABEL[capability],
              value: view.supports(capability) ? 'є' : 'немає',
              ...(view.supports(capability) ? {} : { hint: capabilityReason(provider, capability) }),
            })),
          },
        ],
      },
    ],
  };
}

/** Рядок на кожне право: чи воно є і що дає. Без групи — сірі рядки без значення. */
function rightsRows({ group, provider, supports }: GroupsPageView): UiItem[] {
  const rights: GroupBotRights | null = group?.botRights ?? null;
  const row = (id: string, label: string, ok: boolean | null, hint: string, required: boolean): UiItem => ({
    id: `groups-right-${id}`,
    type: 'item',
    title: label,
    status: { label: ok === null ? '—' : ok ? '✓' : '✗', tone: ok === null ? 'gray' : ok ? 'green' : required ? 'red' : 'gray' },
    comment: hint,
  });
  return [
    row('forum', 'Теми в групі', group ? group.topicsEnabledAt !== null : null, 'Окремий топік на кожне джерело сповіщень; без тем бот у групу не пише', true),
    row('admin', 'Адміністратор', rights ? rights.isAdmin : null, 'Без цього решти прав немає', true),
    row('topics', 'Керування темами', rights ? rights.canManageTopics : null, 'Створювати топіки джерел і писати в закриті', true),
    row('delete', 'Видалення повідомлень', rights ? rights.canDeleteMessages : null, 'Знадобиться, щоб видаляти топіки; зараз бот топіків не видаляє', false),
    row(
      'pin',
      'Закріплення повідомлень',
      rights ? rights.canPinMessages : null,
      supports('pins') ? 'Закріплювати повідомлення в топіках' : `Не використовується. ${capabilityReason(provider, 'pins')}`,
      false,
    ),
  ];
}
