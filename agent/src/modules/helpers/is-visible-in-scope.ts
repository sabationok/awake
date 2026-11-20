import type { UiScope } from '@awake/contracts';

/** Вузол зі scope local не потрапляє в дерево для Vercel/WebApp. */
export function isVisibleInScope(node: { scope?: UiScope }, scope: UiScope): boolean {
  return scope === 'local' || node.scope !== 'local';
}
