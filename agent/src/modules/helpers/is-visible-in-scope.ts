import type { UiScope } from '@awake/contracts';

/** Вузол зі scope local не потрапляє на сторінки для Vercel/WebApp, зі scope mac — нікуди, крім SwiftUI. */
export function isVisibleInScope(node: { scope?: UiScope }, scope: UiScope): boolean {
  if (node.scope === 'mac') return scope === 'mac';
  if (node.scope === 'local') return scope !== 'all';
  return true;
}
