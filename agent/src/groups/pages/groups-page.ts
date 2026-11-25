import type { GroupBotRights, UiButton, UiNode, UiPage, UiRow } from '@awake/contracts';
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

  const buttons: UiButton[] = [
    { id: 'groups-check-rights', label: 'Перевірити права', action: action('checkRights'), variant: 'plain', disabled: offline !== null },
    { id: 'groups-ensure-topics', label: 'Створити топіки', action: action('ensureTopics'), variant: 'filled', disabled: topicsReason !== null },
    { id: 'groups-release', label: 'Заборонити публікацію', action: action('release'), variant: 'plain', disabled: group === null },
    {
      id: 'groups-unbind',
      label: 'Вийти з групи',
      action: action('unbind'),
      variant: 'destructive',
      disabled: group === null,
      confirm: 'Вийти з групи? Сповіщення підуть у приватний чат, повернути групу можна лише новим додаванням бота.',
    },
  ];

  const binding: UiNode[] = [
    {
      id: 'groups-state',
      type: 'status',
      label: group ? group.title : 'Публікацію не дозволено в жодну групу',
      hint: group ? (view.topicsBlocker ?? 'Сповіщення йдуть у топіки групи') : 'Сповіщення йдуть у приватний чат',
      tone: !online ? 'gray' : view.topicsBlocker ? 'orange' : 'green',
    },
    ...view.pending.flatMap((item): UiNode[] => {
      const params = { id: String(item.id) };
      return [
        { id: `groups-pending-${item.id}`, type: 'row', label: item.title, hint: `Запит · бот у групі нічого не робить · додав ${item.addedBy}`, dot: { tone: 'orange' } },
        {
          id: `groups-pending-${item.id}-buttons`,
          type: 'buttons',
          buttons: [
            {
              id: `groups-bind-${item.id}`,
              // Група з дозволом одна: з попередньої він знімається, бот у ній лишається.
              label: 'Дозволити публікацію',
              action: action('bind', params),
              variant: 'filled',
            },
            { id: `groups-leave-${item.id}`, label: 'Вийти з групи', action: action('leave', params), variant: 'plain' },
          ],
        },
      ];
    }),
    { id: 'groups-buttons', type: 'buttons', buttons },
    ...(topicsReason !== null && offline === null ? [{ id: 'groups-buttons-reason', type: 'text', text: topicsReason, tone: 'gray' } satisfies UiNode] : []),
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
function rightsRows({ group, provider, supports }: GroupsPageView): UiRow[] {
  const rights: GroupBotRights | null = group?.botRights ?? null;
  const row = (id: string, label: string, ok: boolean | null, hint: string, required: boolean): UiRow => ({
    id: `groups-right-${id}`,
    type: 'row',
    label,
    value: ok === null ? '—' : ok ? '✓' : '✗',
    hint,
    dot: { tone: ok === null ? 'gray' : ok ? 'green' : required ? 'red' : 'gray' },
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
