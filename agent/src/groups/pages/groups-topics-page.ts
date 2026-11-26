import type { UiNode, UiPage } from '@awake/contracts';
import type { ModuleContext } from '../../modules/types/mac-module';
import { GROUPS_MODULE, GROUPS_TOPICS_PAGE } from '../constants/groups-module';
import { capabilityReason } from '../helpers/capability-reason';
import { groupTopicStateText } from '../helpers/group-topic-rows';
import { groupsTopicSettingKey } from '../helpers/groups-topic-setting';
import { menuItem, settingControl } from '../../modules/helpers/menu-item';
import { withSettingState } from '../helpers/with-setting-state';
import type { GroupTopicRow } from '../types/group-topic-row.types';
import type { GroupsPageView } from '../types/groups-page-view.types';

/**
 * Групи → Топіки: один блок з назвою групи і її станом у шапці, під ним картка на кожне джерело сповіщень — стан
 * топіка і перемикач `topic.<source>`. Конектор без топіків: усе видно сірим з причиною.
 */
export function buildGroupsTopicsPage(ctx: ModuleContext, view: GroupsPageView): UiPage {
  const supported = view.supports('topics');
  const unsupported = supported ? null : capabilityReason(view.provider, 'topics');
  // Чому «Створити заново» зараз сіре для всіх джерел; null — працює.
  const blocked = unsupported ?? view.topicsBlocker;
  return {
    id: GROUPS_TOPICS_PAGE,
    module: GROUPS_MODULE,
    title: 'Топіки',
    icon: { symbol: 'text.bubble.fill', tone: 'accent' },
    group: 'modules',
    scope: 'local',
    children: [
      {
        id: 'groups-topics-state',
        type: 'section',
        title: view.group ? view.group.title : 'Публікацію не дозволено в жодну групу',
        status: {
          label: blocked ?? 'Топіки можна створювати',
          tone: blocked === null ? 'green' : view.group ? 'orange' : 'gray',
        },
        footer:
          'Джерело з вимкненим перемикачем пише в General групи, а Awake і Стан Mac — у приватний чат. Вимкнення не видаляє топік у групі.',
        children: view.rows.map((row): UiNode => topicItem(ctx, row, unsupported, blocked)),
      },
    ],
  };
}

/**
 * Рядок топіка: назва джерела, стан словами, перемикач «публікувати» праворуч. Дія лише тоді, коли топіка в групі
 * немає («Створити») або його закрили («Створити заново»); активний топік дій не має.
 */
function topicItem(ctx: ModuleContext, row: GroupTopicRow, unsupported: string | null, blocked: string | null): UiNode {
  // Стан словом праворуч; під назвою — лише назва топіка в групі.
  const state = groupTopicStateText(row);
  const tone = !row.enabled ? 'gray' : row.state === 'active' ? 'green' : row.state === 'closed' ? 'orange' : 'gray';
  const comment = unsupported ?? (row.topic ? `Топік «${row.topic}»` : undefined);
  const control = settingControl(withSettingState(ctx.settingNode(groupsTopicSettingKey(row.source)), { disabled: unsupported !== null }));
  const recreate = { module: GROUPS_MODULE, name: 'recreateTopic', params: { source: row.source } };
  const disabled = blocked !== null || !row.enabled;
  const actions =
    row.state === 'missing'
      ? [menuItem(`groups-topic-${row.source}-create`, 'Створити', recreate, { variant: 'accent', disabled })]
      : row.state === 'closed'
        ? [
            menuItem(`groups-topic-${row.source}-recreate`, 'Створити заново', recreate, {
              disabled,
              confirm: {
                title: `Створити топік «${row.label}» заново?`,
                text: 'Старий лишиться в групі порожнім: видаліть його в Telegram самі.',
                ok: 'Створити',
              },
            }),
          ]
        : [];
  return {
    id: `groups-topic-${row.source}`,
    type: 'item',
    title: row.label,
    status: { label: state.charAt(0).toUpperCase() + state.slice(1), tone },
    ...(comment ? { comment } : {}),
    ...(control ? { control } : {}),
    ...(actions.length > 0 ? { actions } : {}),
  };
}
