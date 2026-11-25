import type { MacState, UiPage, UiRow } from '@awake/contracts';
import { formatHhmm } from '../../../common/format-hhmm';
import { KEEPERS_MODULE } from '../constants/keepers';
import { keepersSummary } from '../helpers/keepers-summary';
import type { Keeper } from '../types/keeper.types';

const KIND_LABEL: Record<Keeper['kind'], string> = { system: 'система', display: 'екран' };

/**
 * «Keepers»: хто зараз тримає Mac без сну. Наші сесії (Awake, Sleeper) і сторонні процеси, які macOS показує як
 * утримувачів. Сторонні лише відстежуються: таймера їм не поставити.
 */
export function buildKeepersPage(mac: MacState | null, keepers: Keeper[]): UiPage {
  const names = keepersSummary(mac, keepers);
  return {
    id: KEEPERS_MODULE,
    module: KEEPERS_MODULE,
    title: 'Keepers',
    icon: { symbol: 'hand.raised.fill', tone: 'orange' },
    group: 'modules',
    children: [
      {
        id: 'keepers-state',
        type: 'section',
        children: [
          {
            id: 'keepers-status',
            type: 'status',
            label: names.length > 0 ? 'Mac сам не засне' : 'Mac може заснути сам',
            hint: names.length > 0 ? `Тримають: ${names.join(', ')}` : 'Зараз його ніхто не тримає',
            tone: names.length > 0 ? 'green' : 'gray',
          },
        ],
      },
      { id: 'keepers-sessions', type: 'section', title: 'Сесії MaControl', children: sessionRows(mac) },
      {
        id: 'keepers-others',
        type: 'section',
        title: `Інші процеси · ${keepers.length}`,
        footer:
          'Програми, які самі попросили macOS не засинати: Claude під час роботи, браузер з відео, плеєр. Вони лише показуються, таймера їм поставити не можна. Sleeper присипляє Mac попри них.',
        children: [
          {
            id: 'keepers-list',
            type: 'list',
            empty: 'Ніхто не тримає',
            items: keepers.map((keeper) => ({
              id: keeper.id,
              label: keeper.process,
              value: KIND_LABEL[keeper.kind],
              hint: `з ${sinceLabel(keeper.since)} · ${keeper.reason} · pid ${keeper.pid}`,
            })),
          },
        ],
      },
    ],
  };
}

function sessionRows(mac: MacState | null): UiRow[] {
  const awake = mac?.active === true;
  const sleeper = mac?.sleepAt ?? null;
  return [
    {
      id: 'keepers-awake',
      type: 'row',
      label: 'Awake',
      value: awake ? (mac?.until ? `до ${formatHhmm(mac.until)}` : 'йде') : 'немає',
      hint: 'Тримає Mac без сну',
      dot: { tone: awake ? 'green' : 'gray' },
    },
    {
      id: 'keepers-sleeper',
      type: 'row',
      label: 'Sleeper',
      value: sleeper ? `засне о ${formatHhmm(sleeper)}` : 'немає',
      hint: 'Не тримає, а присипляє: спрацює попри всіх у цьому списку',
      dot: { tone: sleeper ? 'indigo' : 'gray' },
    },
  ];
}

/** «17:22», а якщо тримає не з сьогодні — «24.11 17:22». */
function sinceLabel(since: string): string {
  const date = new Date(since);
  const time = formatHhmm(since);
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')} ${time}`;
}
