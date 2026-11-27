import type { UiTree } from '@awake/contracts';

/**
 * Дерево для показу поза Mac: без `app.local` (адреса Mac і код сполучення), без вузлів `qr` і без значень `copy`
 * (там посилання сполучення, адреси tailnet). Обхід загальний, тож новий тип вузла теж пройде крізь нього.
 * contracts лишається лише з типами.
 */
export function toPublicUiTree(tree: UiTree): UiTree {
  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.filter((v) => !(v && typeof v === 'object' && (v as { type?: unknown }).type === 'qr')).map(strip);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'copy').map(([key, v]) => [key, strip(v)]));
  };
  const pages = strip(tree.pages) as UiTree['pages'];
  return { ...tree, pages, app: { ...tree.app, local: null } };
}
