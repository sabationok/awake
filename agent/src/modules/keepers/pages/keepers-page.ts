import type { MacState, UiNode, UiPage } from '@awake/contracts';
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
            type: 'item',
            title: 'Сон Mac',
            icon: { symbol: 'moon.zzz', tone: 'indigo' },
            status: names.length > 0 ? { label: 'Не засне сам', tone: 'green' } : { label: 'Може заснути', tone: 'gray' },
            comment: names.length > 0 ? `Тримають: ${names.join(', ')}` : 'Зараз його ніхто не тримає',
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

/** Наші сесії: стан на статусі, пояснення в коментарі. */
function sessionRows(mac: MacState | null): UiNode[] {
  const awake = mac?.active === true;
  const sleeper = mac?.sleepAt ?? null;
  return [
    {
      id: 'keepers-awake',
      type: 'item',
      title: 'Awake',
      status: { label: awake ? (mac?.until ? `до ${formatHhmm(mac.until)}` : 'йде') : 'немає', tone: awake ? 'green' : 'gray' },
      comment: 'Тримає Mac без сну',
    },
    {
      id: 'keepers-sleeper',
      type: 'item',
      title: 'Sleeper',
      status: { label: sleeper ? `засне о ${formatHhmm(sleeper)}` : 'немає', tone: sleeper ? 'indigo' : 'gray' },
      comment: 'Не тримає, а присипляє: спрацює попри всіх у цьому списку',
    },
  ];
}

/** «17:22», а якщо тримає не з сьогодні — «24.11 17:22». */
function sinceLabel(since: string): string {
  const date = new Date(since);
  const time = formatHhmm(since) ?? '';
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')} ${time}`;
}
