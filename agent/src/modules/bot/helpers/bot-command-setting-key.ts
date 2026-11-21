/** Ключ перемикача команди namespace-а в модулі Bot: `bot.commands.<namespace>`. */
export function botCommandSettingKey(namespace: string): string {
  return `commands.${namespace}`;
}
