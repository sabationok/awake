import { isShown, resolveNodeProps } from '@macontrol/contracts';
import type { UiControl, UiMenuItem, UiNode, UiNodeProps, UiNodeRow, UiPageLayout, UiShow } from '@macontrol/contracts';

/**
 * Таблиця рядків сторінки → вузли для рендерера, лише для сторінки на екрані. `id` вузла — id рядка з сервера, тож
 * ключі React, локальний стан контролок і сховані сповіщення прив'язані до рядка, а не до позиції. Рядок, якого
 * немає в таблиці, пропускається. `state` — копія AppState клієнта: рядок зі `show`, що не виконується, не
 * малюється, секція з усіма дітьми, схованими `show`, теж; `bind` кладе значення стейту в пропи. Без стейту — як є.
 */
export function layoutNodes(layout: UiPageLayout, state?: unknown): UiNode[] {
  const rowsOf = (row: UiNodeRow | undefined): UiNodeRow[] =>
    (row?.children ?? []).map((id) => layout.nodes[id]).filter((child): child is UiNodeRow => Boolean(child));
  const shown = (row: UiNodeRow) => isShown(state, (row.node as { show?: UiShow }).show);

  const build = (row: UiNodeRow): UiNode | null => {
    if (!shown(row)) return null;
    const node = resolveNodeProps(row.node, state);
    switch (node.type) {
      case 'page':
      case 'tab':
        return null;
      case 'section': {
        const rows = rowsOf(row);
        if (rows.length > 0 && !rows.some(shown)) return null;
        return { ...node, id: row.id, children: inflate(row) };
      }
      case 'tabs':
        return {
          ...node,
          id: row.id,
          tabs: rowsOf(row).flatMap((tab) => (tab.node.type === 'tab' ? [{ id: tab.node.value, label: tab.node.label, children: inflate(tab) }] : [])),
        };
      default:
        return { ...node, id: row.id } as UiNode;
    }
  };

  const inflate = (row: UiNodeRow): UiNode[] => rowsOf(row).flatMap((child) => build(child) ?? []);

  return inflate(layout.nodes[layout.root] as UiNodeRow);
}

/**
 * Сторінки, які клієнт уже має: `get` — сторінка, `null` — сервер її не знає, `undefined` — ще не прийшла. `open` —
 * сторінка на екрані: клієнт її підтягує (звіряючи `rev`) і далі тримає свіжою.
 */
export interface PageStore {
  get(pageId: string): UiPageLayout | null | undefined;
  open(pageId: string): void;
}

/** Сторінка лише для перегляду (Vercel): вимкнені перемикачі, списки, кнопки, керування й дії в кожному рядку. */
export function toReadOnlyLayout(layout: UiPageLayout): UiPageLayout {
  const nodes = Object.fromEntries(Object.entries(layout.nodes).map(([id, row]) => [id, { ...row, node: readOnly(row.node) }]));
  return { ...layout, nodes };
}

function readOnly(node: UiNodeProps): UiNodeProps {
  switch (node.type) {
    case 'section':
      return { ...node, actions: disableActions(node.actions) };
    case 'row':
      return node.control ? { ...node, control: disableControl(node.control) } : node;
    case 'item':
      return { ...node, control: node.control ? disableControl(node.control) : undefined, actions: disableActions(node.actions) };
    case 'notice':
      return { ...node, dismiss: undefined };
    case 'switch':
    case 'select':
      return { ...node, disabled: true };
    case 'buttons':
      return { ...node, buttons: node.buttons.map((button) => ({ ...button, disabled: true })) };
    default:
      return node;
  }
}

function disableControl(control: UiControl): UiControl {
  if (control.type === 'button') return { ...control, button: { ...control.button, disabled: true } };
  return { ...control, disabled: true };
}

function disableActions(actions: UiMenuItem[] | undefined): UiMenuItem[] | undefined {
  return actions?.map((action) => ({ ...action, disabled: true }));
}
