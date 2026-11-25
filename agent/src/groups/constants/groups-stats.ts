import { STATS_PERIOD_KEY } from '../../stats';
import type { UiModuleStats } from '../../modules/types/ui-module-stats';
import { GROUPS_STATS_PAGE } from './groups-module';

/** Лічильники модуля «Групи»: value — подія, status — `count`. */
export const GROUPS_EVENTS_STAT_NS = 'groups.events';
export const GROUPS_STAT_STATUS = 'count';

/** Усі події, які пише модуль (`GroupsService.count`). Новий ключ додається тут і в `GROUPS_UI_STATS` разом. */
export const GROUPS_STAT = {
  sent: 'sent',
  failed: 'failed',
  rateLimited: 'rateLimited',
  dropped: 'dropped',
  foreignLeft: 'foreignLeft',
  topicCreated: 'topicCreated',
} as const;

export type GroupsStatKey = (typeof GROUPS_STAT)[keyof typeof GROUPS_STAT];

/** Декларація статистики: сторінка `groups-stats` будується з неї (`buildStatsCharts`). */
export const GROUPS_UI_STATS: UiModuleStats = {
  page: GROUPS_STATS_PAGE,
  namespaces: [
    {
      id: GROUPS_EVENTS_STAT_NS,
      values: [
        { key: GROUPS_STAT.sent, label: 'Надіслано', tone: 'green' },
        { key: GROUPS_STAT.failed, label: 'Не дійшло', tone: 'red' },
        { key: GROUPS_STAT.rateLimited, label: 'Ліміт Telegram (429)', tone: 'yellow' },
        { key: GROUPS_STAT.dropped, label: 'Випало з черги', tone: 'orange' },
        { key: GROUPS_STAT.topicCreated, label: 'Топіків створено', tone: 'accent' },
        { key: GROUPS_STAT.foreignLeft, label: 'Вихід з чужої групи', tone: 'indigo' },
      ],
      statuses: [{ key: GROUPS_STAT_STATUS, label: 'Кількість', tone: 'accent' }],
    },
  ],
  charts: [
    {
      id: `${GROUPS_STATS_PAGE}-delivery`,
      title: 'Сповіщення в групу',
      namespace: GROUPS_EVENTS_STAT_NS,
      by: 'value',
      format: 'count',
      keys: [GROUPS_STAT.sent, GROUPS_STAT.failed, GROUPS_STAT.rateLimited, GROUPS_STAT.dropped],
    },
    {
      id: `${GROUPS_STATS_PAGE}-lifecycle`,
      title: 'Топіки і чужі групи',
      namespace: GROUPS_EVENTS_STAT_NS,
      by: 'value',
      format: 'count',
      keys: [GROUPS_STAT.topicCreated, GROUPS_STAT.foreignLeft],
    },
  ],
  filters: { period: STATS_PERIOD_KEY },
};
