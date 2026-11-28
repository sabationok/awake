import type { UiList } from '@macontrol/contracts';
import type { BotEventRecord } from '../../../bot-journal';
import { formatSessionStart } from '../../helpers/format-session-start';
import { BOT_EVENT_TYPE_LABEL, BOT_SOURCE_LABEL } from '../constants/bot-source-labels';

/** Рядок журналу: що викликали, під ним час, джерело (з проксі, якщо був), тип і помилка. `proxyTitle` — назва проксі за id. */
export function botEventListItem(event: BotEventRecord, proxyTitle: (id: string) => string): UiList['items'][number] {
  const source = event.proxy ? `${BOT_SOURCE_LABEL[event.source]} через ${proxyTitle(event.proxy)}` : BOT_SOURCE_LABEL[event.source];
  const label = event.type === 'screen' ? `${event.namespace} → ${event.name || 'меню'}` : `${event.namespace}.${event.name}`;
  return {
    id: String(event.id),
    label,
    hint: [formatSessionStart(event.at), source, BOT_EVENT_TYPE_LABEL[event.type], event.error]
      .filter((part): part is string => !!part)
      .join(' · '),
    value: event.ok ? 'ok' : 'помилка',
  };
}
