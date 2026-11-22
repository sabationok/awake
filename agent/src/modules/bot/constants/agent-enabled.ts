import type { SettingDefinition } from '@awake/contracts';

export const AGENT_MODULE = 'bot';
export const AGENT_ENABLED_KEY = 'enabled';

/**
 * Вмикач агента (бота) на Огляді. Агент — лише частина сервера: неймспейси дій і екранів, якими людина керує Mac
 * з Telegram і вебу. Вимкнений агент відмовляє цим транспортам; сервер, фонові задачі, статистика і сама Mac-аппка
 * працюють далі.
 */
export const AGENT_ENABLED_SETTING: SettingDefinition = {
  type: 'switch',
  key: AGENT_ENABLED_KEY,
  label: 'Агент',
  hint: 'Дії й команди з Telegram і вебу',
  icon: { symbol: 'cpu.fill', tone: 'accent' },
  scope: 'mac',
  page: 'bot-overview',
  default: true,
};
