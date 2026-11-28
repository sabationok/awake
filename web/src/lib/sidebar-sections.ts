import type { UiPageInfo, UiShell } from '@awake/contracts';

/**
 * Вузол навігації: сторінка і її дочірні вузли (модуль Awake → Налаштування сесії, Трекінг…).
 * Меню рекурсивне: вкладений модуль (Групи під Telegram) — дочірній вузол зі своїми сторінками.
 */
export interface SidebarNode {
  page: UiPageInfo;
  children: SidebarNode[];
}

/** Група пунктів меню, відділена від інших. */
export interface SidebarSection {
  key: string;
  nodes: SidebarNode[];
}

/**
 * Те саме меню, що в Mac-аппці (MainView.swift): модуль — це його перша сторінка, решта сторінок модуля — дочірні;
 * далі системні сторінки окремою групою. Порожні групи не малюються.
 */
export function sidebarSections(shell: UiShell | null): SidebarSection[] {
  const pages = shell?.pages ?? [];
  const modules = shell?.modules ?? [];
  const pagesOf = (id: string) => pages.filter((item) => item.module === id && item.group === 'modules');
  // Модуль з `parent` (Групи → Telegram) не має свого пункту: його сторінки — діти провайдера, після його власних.
  const moduleNode = (id: string): SidebarNode[] => {
    const [page, ...rest] = pagesOf(id);
    const nested = modules.filter((child) => child.parent === id && !child.disabled).flatMap((child) => moduleNode(child.id));
    return page ? [{ page, children: [...rest.map((p) => ({ page: p, children: [] })), ...nested] }] : [];
  };
  const nodes = modules.filter((module) => !module.parent).flatMap((module) => moduleNode(module.id));
  const system = pages.filter((item) => item.group === 'system').map((page) => ({ page, children: [] }));
  return [
    { key: 'modules', nodes },
    { key: 'system', nodes: system },
  ].filter((section) => section.nodes.length > 0);
}

/** Усі сторінки меню по порядку: батько, далі його діти (вглиб). */
export function sidebarPages(sections: SidebarSection[]): UiPageInfo[] {
  const walk = (node: SidebarNode): UiPageInfo[] => [node.page, ...node.children.flatMap(walk)];
  return sections.flatMap((section) => section.nodes.flatMap(walk));
}

/** Шлях від кореня до сторінки `id`: [модуль, …, сама сторінка]; порожній, якщо сторінки немає. */
export function pathTo(sections: SidebarSection[], id: string | undefined): SidebarNode[] {
  const find = (node: SidebarNode): SidebarNode[] | null => {
    if (node.page.id === id) return [node];
    for (const child of node.children) {
      const rest = find(child);
      if (rest) return [node, ...rest];
    }
    return null;
  };
  for (const node of sections.flatMap((section) => section.nodes)) {
    const path = find(node);
    if (path) return path;
  }
  return [];
}

/**
 * Вкладки поточного рівня. Сторінка з дітьми сама є рівнем: вона і її діти. Листова сторінка — рівень її батька.
 * Повертає вузол-рівень і вкладки; без дітей на рівні вкладок немає.
 */
export function levelOf(path: SidebarNode[]): { level: SidebarNode | null; tabs: UiPageInfo[] } {
  const current = path[path.length - 1];
  const level = current?.children.length ? current : (path[path.length - 2] ?? null);
  return { level, tabs: level ? [level.page, ...level.children.map((child) => child.page)] : [] };
}
