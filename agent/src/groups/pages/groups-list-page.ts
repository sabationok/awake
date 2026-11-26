import type { UiMenuItem, UiNode, UiPage, UiStatusBadge, UiTabs } from '@awake/contracts';
import { menuItem } from '../../modules/helpers/menu-item';
import { GROUPS_LIST_PAGE, GROUPS_MODULE } from '../constants/groups-module';
import type { GroupChatEntity } from '../entities/group-chat.entity';
import type { GroupsPageView } from '../types/groups-page-view.types';

const action = (name: string, params?: Record<string, string>) => ({ module: GROUPS_MODULE, name, ...(params ? { params } : {}) });

/**
 * Групи → Список груп: усі групи, де бот є, за станом. Активні — публікація дозволена (зараз така одна), неактивні —
 * дозвіл знято, запити — бота додали, а власник ще не вирішив. Вкладки з лічильниками; видно один список за раз.
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
      {
        id: 'groups-list',
        type: 'section',
        children: [
          {
            id: 'groups-list-tabs',
            type: 'tabs',
            sticky: true,
            tabs: [
              tab('active', 'Активні', 'Сюди бот публікує сповіщення. Зараз активною може бути одна група.', 'Активних груп немає', active, {
                label: 'Активна',
                tone: 'green',
              }, () => [
                menuItem('groups-list-release', 'Деактивувати', action('release')),
                menuItem('groups-list-unbind', 'Вийти з групи', action('unbind'), {
                  variant: 'danger',
                  confirm: {
                    title: 'Вийти з групи?',
                    text: 'Сповіщення підуть у приватний чат, повернути групу можна лише новим додаванням бота.',
                    ok: 'Вийти',
                  },
                }),
              ]),
              tab(
                'inactive',
                'Неактивні',
                'Бот у групі є, але нічого в ній не робить. «Активувати» перемикає публікацію сюди; попередня активна стає неактивною.',
                'Неактивних груп немає',
                view.inactive,
                { label: 'Неактивна', tone: 'gray' },
                (item) => waitingActions(item, 'Активувати'),
              ),
              tab(
                'requests',
                'Запити',
                'Бота додали в групу, а ви ще не вирішили. До вашого рішення він нічого в ній не робить.',
                'Запитів немає',
                view.pending,
                { label: 'Запит', tone: 'orange' },
                (item) => waitingActions(item, 'Підтвердити'),
              ),
            ],
          },
        ],
      },
    ],
  };
}

function waitingActions(item: GroupChatEntity, allow: string): UiMenuItem[] {
  const params = { id: String(item.id) };
  return [
    menuItem(`groups-list-bind-${item.id}`, allow, action('bind', params), { variant: 'accent' }),
    menuItem(`groups-list-leave-${item.id}`, 'Вийти з групи', action('leave', params), { variant: 'danger' }),
  ];
}

/** Вкладка списку: лічильник у назві, картка на групу, підпис під списком. Порожня вкладка пояснює, чому порожньо. */
function tab(
  id: string,
  title: string,
  caption: string,
  empty: string,
  items: GroupChatEntity[],
  status: UiStatusBadge,
  actions: (item: GroupChatEntity) => UiMenuItem[],
): UiTabs['tabs'][number] {
  const cards = items.map(
    (item): UiNode => ({
      id: `groups-list-${id}-${item.id}`,
      type: 'item',
      title: item.title,
      status,
      comment: `Додав ${item.addedBy}`,
      actions: actions(item),
    }),
  );
  return {
    id,
    label: `${title} · ${items.length}`,
    children: [
      ...(cards.length > 0 ? cards : [{ id: `groups-list-${id}-empty`, type: 'text' as const, text: empty, tone: 'gray' as const }]),
      { id: `groups-list-${id}-caption`, type: 'text', text: caption },
    ],
  };
}
