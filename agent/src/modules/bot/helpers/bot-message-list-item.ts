import type { UiList } from '@awake/contracts';
import type { BotMessageRecord } from '../../../bot-journal';
import { formatSessionStart } from '../../helpers/format-session-start';

const DIRECTION_MARK: Record<BotMessageRecord['direction'], string> = { in: '⬇️', out: '⬆️' };
const TYPE_LABEL: Record<BotMessageRecord['type'], string> = { command: 'команда', button: 'кнопка', notify: 'сповіщення' };

/** Рядок журналу: напрямок і текст, під ним час, тип, модуль і помилка. */
export function botMessageListItem(message: BotMessageRecord): UiList['items'][number] {
  return {
    id: String(message.id),
    label: `${DIRECTION_MARK[message.direction]} ${message.text}`,
    hint: [formatSessionStart(message.at), TYPE_LABEL[message.type], message.namespace, message.error]
      .filter((part): part is string => !!part)
      .join(' · '),
    value: message.error === 'denied' ? 'вимкнено' : message.ok ? 'ok' : 'помилка',
  };
}
