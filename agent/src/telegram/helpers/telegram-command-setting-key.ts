/** Ключ перемикача команди namespace-а в модулі Telegram: `telegram.commands.<namespace>`. */
export function telegramCommandSettingKey(namespace: string): string {
  return `commands.${namespace}`;
}
