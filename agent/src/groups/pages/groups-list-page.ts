import type { UiButton, UiNode, UiPage } from '@awake/contracts';
import { GROUPS_LIST_PAGE, GROUPS_MODULE } from '../constants/groups-module';
import type { GroupChatEntity } from '../entities/group-chat.entity';
import type { GroupsPageView } from '../types/groups-page-view.types';

const action = (name: string, params?: Record<string, string>) => ({ module: GROUPS_MODULE, name, ...(params ? { params } : {}) });

/**
 * Групи → Список груп: усі групи, де бот є, за станом. Активні — публікація дозволена (зараз така одна), неактивні —
 * дозвіл знято, запити — бота додали, а власник ще не вирішив. Порожня секція лишається видимою з поясненням.
 */
export function buildGroupsListPage(view: GroupsPageView): UiPage {
  const active = view.group && view.group.leftAt === null ? [view.group] : [];
  return {
    id: GROUPS_LIST_PAGE,
    module: GROUPS_MODULE,
    title: 'Список груп',
    icon: { symbol: 'list.bullet', tone: 'accent' },
    group: 'modules',
    // Дозвіл на публікацію — справа адміна: через Vercel не віддаємо.
    scope: 'local',
    children: [
      section('active', 'Активні', 'Сюди бот публікує сповіщення. Зараз активною може бути одна група.', 'Активних груп немає', active, 'green', () => [
        { id: 'groups-list-release', label: 'Деактивувати', action: action('release'), variant: 'plain' },
        {
          id: 'groups-list-unbind',
          label: 'Вийти з групи',
          action: action('unbind'),
          variant: 'destructive',
          confirm: 'Вийти з групи? Сповіщення підуть у приватний чат, повернути групу можна лише новим додаванням бота.',
        },
      ]),
      section(
        'inactive',
        'Неактивні',
        'Бот у групі є, але нічого в ній не робить. «Активувати» перемикає публікацію сюди; попередня активна стає неактивною.',
        'Неактивних груп немає',
        view.inactive,
        'gray',
        (item) => waitingButtons(item, 'Активувати'),
      ),
      section(
        'requests',
        'Запити (не підтверджені)',
        'Бота додали в групу, а ви ще не вирішили. До вашого рішення він нічого в ній не робить.',
        'Запитів немає',
        view.pending,
        'orange',
        (item) => waitingButtons(item, 'Підтвердити'),
      ),
    ],
  };
}

function waitingButtons(item: GroupChatEntity, allow: string): UiButton[] {
  const params = { id: String(item.id) };
  return [
    { id: `groups-list-bind-${item.id}`, label: allow, action: action('bind', params), variant: 'filled' },
    { id: `groups-list-leave-${item.id}`, label: 'Вийти з групи', action: action('leave', params), variant: 'plain' },
  ];
}

function section(
  id: string,
  title: string,
  footer: string,
  empty: string,
  items: GroupChatEntity[],
  tone: 'green' | 'gray' | 'orange',
  buttons: (item: GroupChatEntity) => UiButton[],
): UiNode {
  const rows = items.flatMap((item): UiNode[] => [
    { id: `groups-list-${id}-${item.id}`, type: 'row', label: item.title, hint: `Додав ${item.addedBy}`, dot: { tone } },
    { id: `groups-list-${id}-${item.id}-buttons`, type: 'buttons', buttons: buttons(item) },
  ]);
  return {
    id: `groups-list-${id}`,
    type: 'section',
    title: `${title} · ${items.length}`,
    footer,
    children: rows.length > 0 ? rows : [{ id: `groups-list-${id}-empty`, type: 'text', text: empty, tone: 'gray' }],
  };
}
