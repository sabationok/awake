import type { UiNodeRow, UiPageLayout } from '@awake/contracts';

/**
 * Сторінка для показу поза Mac: без рядків `qr` (і їхніх нащадків) і без значень `copy` (посилання сполучення,
 * адреси tailnet). Обхід значень загальний, тож новий тип вузла теж пройде крізь нього. contracts лишається лише з типами.
 */
export function toPublicLayout(layout: UiPageLayout): UiPageLayout {
  const hidden = new Set<string>();
  const hide = (id: string) => {
    if (hidden.has(id)) return;
    hidden.add(id);
    layout.nodes[id]?.children.forEach(hide);
  };
  Object.values(layout.nodes).forEach((row) => row.node.type === 'qr' && hide(row.id));

  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'copy').map(([key, v]) => [key, strip(v)]));
  };

  const nodes: Record<string, UiNodeRow> = {};
  for (const row of Object.values(layout.nodes)) {
    if (hidden.has(row.id)) continue;
    nodes[row.id] = { ...row, children: row.children.filter((id) => !hidden.has(id)), node: strip(row.node) as UiNodeRow['node'] };
  }
  return { ...layout, nodes };
}
