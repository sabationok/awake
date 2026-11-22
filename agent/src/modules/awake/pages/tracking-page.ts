import type { SessionRecord, UiPage, UiRow } from '@awake/contracts';
import { formatDuration } from '../../helpers/format-duration';
import type { SessionsHistory } from '../../../sessions/types/sessions-history.types';
import { sessionListItem } from '../helpers/session-list-item';
import { sessionsPeriodCharts } from '../helpers/sessions-period-charts';
import { sessionsPeriodRow } from '../helpers/sessions-period-row';
import { summarizeSessions } from '../helpers/summarize-sessions';
import { TRACKING_HISTORY_LIMIT } from '../constants/session-limits';
import { TRACKING_WINDOW_MS } from '../constants/tracking-window';

export function buildTrackingPage(sessions: SessionRecord[], history: SessionsHistory, now: Date): UiPage {
  const summary = summarizeSessions(sessions, now.getTime() - TRACKING_WINDOW_MS, now.getTime());
  const rows: UiRow[] = [
    { id: 'count', type: 'row', label: 'Сесій', value: String(summary.count) },
    { id: 'total', type: 'row', label: 'Разом', value: formatDuration(summary.totalMs) },
    {
      id: 'average',
      type: 'row',
      label: 'У середньому',
      value: summary.averageMs === null ? '—' : formatDuration(summary.averageMs),
    },
  ];

  return {
    id: 'tracking',
    module: 'awake',
    title: 'Трекінг',
    icon: { symbol: 'chart.bar.xaxis', tone: 'accent' },
    group: 'modules',
    children: [
      { id: 'week', type: 'section', title: 'За 7 днів', children: rows },
      {
        id: 'days',
        type: 'section',
        title: 'По днях',
        footer: 'Сесій · час. Час закритих сесій, розкладений по годинах, у які Mac справді не спав.',
        children: [...sessionsPeriodCharts(history.days, 'day'), ...[...history.days].reverse().map((period) => sessionsPeriodRow(period, 'day'))],
      },
      {
        id: 'weeks',
        type: 'section',
        title: 'По тижнях',
        children: [...sessionsPeriodCharts(history.weeks, 'week'), ...[...history.weeks].reverse().map((period) => sessionsPeriodRow(period, 'week'))],
      },
      {
        id: 'months',
        type: 'section',
        title: 'По місяцях',
        footer: 'Тижні й місяці — за UTC.',
        children: [...sessionsPeriodCharts(history.months, 'month'), ...[...history.months].reverse().map((period) => sessionsPeriodRow(period, 'month'))],
      },
      {
        id: 'history',
        type: 'section',
        title: 'Історія',
        children: [
          {
            id: 'sessions',
            type: 'list',
            items: sessions.slice(0, TRACKING_HISTORY_LIMIT).map((session) => sessionListItem(session, now)),
            empty: 'Ще не було жодної сесії',
          },
        ],
      },
    ],
  };
}
