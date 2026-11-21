import type { UiList } from '@awake/contracts';
import type { BotEventRecord } from '../../../bot-journal';
import { formatSessionStart } from '../../helpers/format-session-start';
import { BOT_EVENT_TYPE_LABEL, BOT_SOURCE_LABEL } from '../constants/bot-source-labels';

/** Рядок журналу: що викликали, під ним час, джерело, тип і помилка. */
export function botEventListItem(event: BotEventRecord): UiList['items'][number] {
  const label = event.type === 'screen' ? `${event.namespace} → ${event.name || 'меню'}` : `${event.namespace}.${event.name}`;
  return {
    id: String(event.id),
    label,
    hint: [formatSessionStart(event.at), BOT_SOURCE_LABEL[event.source], BOT_EVENT_TYPE_LABEL[event.type], event.error]
      .filter((part): part is string => !!part)
      .join(' · '),
    value: event.ok ? 'ok' : 'помилка',
  };
}
