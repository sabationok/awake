import type { UiPage } from '@awake/contracts';
import type { BotMessageRecord } from '../../../bot-journal';
import { botMessageListItem } from '../helpers/bot-message-list-item';

/** «Журнал»: останні команди й кнопки від власника і сповіщення від бота. */
export function buildBotMessagesPage(messages: BotMessageRecord[]): UiPage {
  return {
    id: 'bot-messages',
    module: 'bot',
    title: 'Журнал',
    icon: { symbol: 'text.bubble.fill', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'messages',
        type: 'section',
        title: 'Повідомлення',
        footer: '⬇️ — від тебе в Telegram, ⬆️ — від бота. Зберігаються останні 500.',
        children: [{ id: 'list', type: 'list', items: messages.map(botMessageListItem), empty: 'Бот ще нічого не отримував і не надсилав' }],
      },
    ],
  };
}
