import { createHash } from 'node:crypto';
import type { UiNode, UiNodeProps, UiNodeRow, UiPage, UiPageLayout } from '@awake/contracts';

/** Вузол сторінки з його id рядка: так збирання бачить, який рядок вийшов з якого вузла (графіки для live-тіків). */
export type OnPageNode = (rowId: string, node: UiNode) => void;

/**
 * Сторінка модуля (вкладені вузли) → таблиця рядків за `id` (docs/specs/ui-layout-spec.md «Таблиця вузлів»).
 * Id рядка — `<сторінка>.<id вузла>`; той самий id вузла вдруге на сторінці бере шлях батька (`<батько>.<id>`), щоб
 * рядки не злиплись. Вкладка `tabs` — свій рядок `<tabs>.<id вкладки>` з типом `tab`. `parentId` ставить лише
 * нормалізація. `rev` — хеш рядків у порядку обходу: той самий зміст дає той самий `rev` і після рестарту.
 */
export function normalizePage(page: UiPage, onNode?: OnPageNode): UiPageLayout {
  const rows: UiNodeRow[] = [];
  const taken = new Set<string>([page.id]);

  const claim = (parentId: string, localId: string): string => {
    const flat = `${page.id}.${localId}`;
    let id = taken.has(flat) ? `${parentId}.${localId}` : flat;
    for (let n = 2; taken.has(id); n++) id = `${parentId}.${localId}~${n}`;
    taken.add(id);
    return id;
  };

  const add = (id: string, parentId: string | null, node: UiNodeProps): UiNodeRow => {
    const row: UiNodeRow = { id, parentId, children: [], node };
    rows.push(row);
    return row;
  };

  const walk = (nodes: UiNode[], parent: UiNodeRow) => {
    for (const node of nodes) {
      const id = claim(parent.id, node.id);
      parent.children.push(id);
      onNode?.(id, node);
      if (node.type === 'section') {
        const { id: _id, children, ...props } = node;
        walk(children, add(id, parent.id, props));
      } else if (node.type === 'tabs') {
        const { id: _id, tabs, ...props } = node;
        const row = add(id, parent.id, props);
        for (const tab of tabs) {
          const tabId = `${id}.${tab.id}`;
          taken.add(tabId);
          row.children.push(tabId);
          walk(tab.children, add(tabId, id, { type: 'tab', value: tab.id, label: tab.label }));
        }
      } else {
        const { id: _id, ...props } = node;
        add(id, parent.id, props as UiNodeProps);
      }
    }
  };

  const root = add(page.id, null, { type: 'page' });
  walk(page.children, root);

  const rev = createHash('sha1').update(JSON.stringify(rows)).digest('hex').slice(0, 16);
  return { id: page.id, rev, root: page.id, nodes: Object.fromEntries(rows.map((row) => [row.id, row])) };
}

/** `rev` будь-якого JSON-змісту (індекс роутів): той самий зміст — той самий хеш. */
export function contentRev(value: unknown): string {
  return createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}
