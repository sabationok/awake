/**
 * callback_data кнопок, до 64 байтів:
 * - `nav:<module>:<screen>` малює екран меню (і «Оновити», і «Назад», і перехід вглиб);
 * - `do:<module>:<screen>:<action>[:k=v,…]` виконує дію і малює екран `<screen>`.
 * Старі повідомлення ще мають `menu:<module>` і `act:<module>:<action>[:k=v]`: вони ведуть на головний екран.
 */
export type BotCallback =
  | { kind: 'nav'; module: string; screen: string }
  | { kind: 'do'; module: string; screen: string; action: string; params?: Record<string, string> };

export function encodeNav(module: string, screen: string): string {
  return `nav:${module}:${screen}`;
}

export function encodeAction(module: string, screen: string, action: string, params?: Record<string, string>): string {
  const query = params ? Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',') : '';
  return query ? `do:${module}:${screen}:${action}:${query}` : `do:${module}:${screen}:${action}`;
}

export function decodeCallback(data: string): BotCallback | null {
  const parts = data.split(':');
  const [kind, module] = parts;
  if (!module) return null;
  switch (kind) {
    case 'nav':
      return { kind, module, screen: parts[2] ?? '' };
    case 'menu':
      return { kind: 'nav', module, screen: '' };
    case 'do':
      return parts[3] ? { kind, module, screen: parts[2] ?? '', action: parts[3], params: parseQuery(parts[4]) } : null;
    case 'act':
      return parts[2] ? { kind: 'do', module, screen: '', action: parts[2], params: parseQuery(parts[3]) } : null;
    default:
      return null;
  }
}

function parseQuery(query: string | undefined): Record<string, string> | undefined {
  if (!query) return undefined;
  return Object.fromEntries(query.split(',').map((pair) => pair.split('=') as [string, string]));
}
