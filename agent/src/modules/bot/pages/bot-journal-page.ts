import type { UiPage } from '@macontrol/contracts';
import type { BotEventRecord } from '../../../bot-journal';
import type { AgentProxy } from '../../../transports';
import { botEventListItem } from '../helpers/bot-event-list-item';

/** «Журнал»: останні виклики бота з будь-якого джерела. */
export function buildBotJournalPage(events: BotEventRecord[], proxies: AgentProxy[]): UiPage {
  const proxyTitle = (id: string) => proxies.find((proxy) => proxy.id === id)?.title ?? id;
  return {
    id: 'bot-journal',
    module: 'bot',
    title: 'Журнал',
    icon: { symbol: 'list.bullet.rectangle.fill', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'events',
        type: 'section',
        title: 'Останні виклики',
        footer: 'Зберігаються останні 500. Відхилені Telegram-ом команди сюди не потрапляють — вони в статистиці Telegram.',
        children: [{ id: 'list', type: 'list', items: events.map((event) => botEventListItem(event, proxyTitle)), empty: 'Бота ще ніхто не викликав' }],
      },
    ],
  };
}
