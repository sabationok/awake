/** Ключ перемикача події в модулі telegram. Ключі старі (`events.relay.status`), тож збережені значення лишаються. */
export function telegramNotificationSettingKey(source: string, type: string): string {
  return `events.${source}.${type}`;
}
