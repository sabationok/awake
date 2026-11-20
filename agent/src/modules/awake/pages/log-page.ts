import type { LogRecord, UiPage } from '@awake/contracts';
import { formatClock } from '../helpers/format-clock';
import { isToday } from '../helpers/is-today';

/** Сторінка «Журнал» системна: видна і на Mac, і у вебі, тож без scope local. */
export function buildLogPage(logs: LogRecord[], now: Date): UiPage {
  return {
    id: 'log',
    module: 'awake',
    title: 'Журнал',
    icon: { symbol: 'list.bullet.rectangle', tone: 'gray' },
    group: 'system',
    children: [
      {
        id: 'entries',
        type: 'section',
        children: [
          {
            id: 'logs',
            type: 'list',
            items: logs.map((log) => ({
              id: String(log.id),
              label: log.text,
              value: formatClock(log.at),
              hint: isToday(log.at, now)
                ? undefined
                : new Date(log.at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }),
            })),
            empty: 'Записів ще немає',
          },
        ],
      },
    ],
  };
}
