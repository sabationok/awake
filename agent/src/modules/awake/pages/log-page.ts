import type { LogRecord, UiPage } from '@awake/contracts';
import { formatClock } from '../helpers/format-clock';

export function buildLogPage(logs: LogRecord[]): UiPage {
  return {
    id: 'log',
    module: 'awake',
    title: 'Журнал',
    icon: { symbol: 'list.bullet.rectangle', tone: 'gray' },
    group: 'modules',
    scope: 'local',
    children: [
      {
        id: 'entries',
        type: 'section',
        children: [
          {
            id: 'list',
            type: 'list',
            items: logs.map((log) => ({ id: String(log.id), label: log.text, value: formatClock(log.at) })),
            empty: 'Записів ще немає',
          },
        ],
      },
    ],
  };
}
