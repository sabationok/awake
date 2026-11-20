/**
 * callback_data кнопок: `act:<module>:<action>[:k=v,…]` виконує дію, `menu:<module>` перемальовує меню.
 * Telegram обмежує її 64 байтами, тож параметри мають бути короткими (тривалість, id).
 */
export type BotCallback =
  | { kind: 'act'; module: string; action: string; params?: Record<string, string> }
  | { kind: 'menu'; module: string };

export function encodeAction(module: string, action: string, params?: Record<string, string>): string {
  const query = params ? Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',') : '';
  return query ? `act:${module}:${action}:${query}` : `act:${module}:${action}`;
}

export function encodeMenu(module: string): string {
  return `menu:${module}`;
}

export function decodeCallback(data: string): BotCallback | null {
  const [kind, module, action, query] = data.split(':');
  if (kind === 'menu' && module) return { kind, module };
  if (kind !== 'act' || !module || !action) return null;
  const params = query
    ? Object.fromEntries(query.split(',').map((pair) => pair.split('=') as [string, string]))
    : undefined;
  return { kind, module, action, params };
}
