/** Опції класу-обробника: `@Bot('MaControl', { namespace: 'sleep', command: 'sleep', description: '🌙 Sleeper' })`. */
export interface BotOptions {
  /** Простір імен дій і екранів, як namespace у WsGateway. Кнопка шле `{ namespace, name }`. */
  namespace: string;
  /** Вхідна команда в чат-ботах, без слеша. Без неї namespace відкривається лише кнопками. */
  command?: string;
  /** Назва в списку команд і на стартовому екрані. */
  description?: string;
}

/** Що знає реєстр про namespace: опції `@Bot` плюс ім'я бота. */
export interface BotNamespace extends BotOptions {
  bot: string;
}
