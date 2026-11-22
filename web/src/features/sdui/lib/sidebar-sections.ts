import type { UiPage, UiTree } from '@awake/contracts';

/** Пункт меню і його вкладені сторінки (модуль Awake → Налаштування сесії, Трекінг…). */
export interface SidebarNode {
  page: UiPage;
  children: UiPage[];
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
export function sidebarSections(tree: UiTree | null): SidebarSection[] {
  const pages = tree?.pages ?? [];
  const modules = (tree?.modules ?? []).flatMap((module): SidebarNode[] => {
    const [page, ...children] = pages.filter((item) => item.module === module.id && item.group === 'modules');
    return page ? [{ page, children }] : [];
  });
  const system = pages.filter((item) => item.group === 'system').map((page) => ({ page, children: [] }));
  return [
    { key: 'modules', nodes: modules },
    { key: 'system', nodes: system },
  ].filter((section) => section.nodes.length > 0);
}

/** Усі сторінки меню по порядку: батько, далі його діти. */
export function sidebarPages(sections: SidebarSection[]): UiPage[] {
  return sections.flatMap((section) => section.nodes.flatMap((node) => [node.page, ...node.children]));
}
