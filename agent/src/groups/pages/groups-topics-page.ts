import type { UiNode, UiPage } from '@awake/contracts';
import type { ModuleContext } from '../../modules/types/mac-module';
import { GROUPS_MODULE, GROUPS_TOPICS_PAGE } from '../constants/groups-module';
import { capabilityReason } from '../helpers/capability-reason';
import { groupTopicStateText } from '../helpers/group-topic-rows';
import { groupsTopicSettingKey } from '../helpers/groups-topic-setting';
import { withSettingState } from '../helpers/with-setting-state';
import type { GroupTopicRow } from '../types/group-topic-row.types';
import type { GroupsPageView } from '../types/groups-page-view.types';

/**
 * Групи → Топіки: секція на кожне джерело сповіщень — його топік і стан, перемикач `topic.<source>` і «Створити
 * заново». Конектор без топіків: усе видно сірим з причиною.
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
        footer:
          'Джерело з вимкненим перемикачем пише в General групи, а джерела, які шле скрипт Mac (Awake, Стан Mac), — у приватний чат. Вимкнення не видаляє топік у групі.',
        children: [
          {
            id: 'groups-topics-status',
            type: 'status',
            label: view.group ? view.group.title : 'Публікацію не дозволено в жодну групу',
            hint: blocked ?? 'Топіки можна створювати',
            tone: blocked === null ? 'green' : view.group ? 'orange' : 'gray',
          },
        ],
      },
      ...view.rows.map((row): UiNode => sourceSection(ctx, row, unsupported, blocked)),
    ],
  };
}

function sourceSection(ctx: ModuleContext, row: GroupTopicRow, unsupported: string | null, blocked: string | null): UiNode {
  const state = groupTopicStateText(row);
  const hint = unsupported ?? `${row.topic ? `«${row.topic}» · ` : ''}${state}${row.viaMac ? ' · шле скрипт Mac' : ''}`;
  return {
    id: `groups-topic-${row.source}`,
    type: 'section',
    title: row.label,
    children: [
      withSettingState(ctx.settingNode(groupsTopicSettingKey(row.source)), { disabled: unsupported !== null, hint }),
      {
        id: `groups-topic-${row.source}-buttons`,
        type: 'buttons',
        buttons: [
          {
            id: `groups-topic-${row.source}-recreate`,
            label: row.state === 'missing' ? 'Створити' : 'Створити заново',
            action: { module: GROUPS_MODULE, name: 'recreateTopic', params: { source: row.source } },
            variant: 'plain',
            disabled: blocked !== null || !row.enabled,
            ...(row.state === 'missing'
              ? {}
              : { confirm: `Створити новий топік «${row.label}»? Старий лишиться в групі порожнім: видаліть його в Telegram самі.` }),
          },
        ],
      },
    ],
  };
}
