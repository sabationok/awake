import type { UiScope } from '@macontrol/contracts';
import { isVisibleInScope } from '../../modules/helpers/is-visible-in-scope';
import { STATE_BRANCH_SCOPES } from '../constants/state-branch-scopes';

/** Scope гілки: найдовший префікс з мапи; налаштування — scope свого визначення (`settingScope`). */
export function stateBranchScope(path: string, settingScope: (module: string, key: string) => UiScope | undefined): UiScope {
  const [root, module, key] = path.split('.');
  if (root === 'modules' && module && key) return settingScope(module, key) ?? 'all';
  let best: UiScope = 'all';
  let length = -1;
  for (const [prefix, scope] of Object.entries(STATE_BRANCH_SCOPES)) {
    if ((path === prefix || path.startsWith(`${prefix}.`)) && prefix.length > length) {
      best = scope;
      length = prefix.length;
    }
  }
  return best;
}

/**
 * Значення за `path` лише з гілками, які бачить `audience`. `undefined` — гілки цьому scope не видно зовсім.
 * Одна функція для повного стейту й для кожної операції патча.
 */
export function filterStateAt(
  path: string,
  value: unknown,
  audience: UiScope,
  settingScope: (module: string, key: string) => UiScope | undefined,
): unknown {
  if (path && !isVisibleInScope({ scope: stateBranchScope(path, settingScope) }, audience)) return undefined;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const filtered = filterStateAt(path ? `${path}.${key}` : key, child, audience, settingScope);
    if (filtered !== undefined) out[key] = filtered;
  }
  return out;
}
