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
  const modules = tree?.modules ?? [];
  const pagesOf = (id: string) => pages.filter((item) => item.module === id && item.group === 'modules');
  // Модуль з `parent` (Групи → Telegram) не має свого пункту: його сторінки — діти провайдера, після його власних.
  const nodes = modules
    .filter((module) => !module.parent)
    .flatMap((module): SidebarNode[] => {
      const [page, ...children] = pagesOf(module.id);
      const nested = modules.filter((child) => child.parent === module.id && !child.disabled).flatMap((child) => pagesOf(child.id));
      return page ? [{ page, children: [...children, ...nested] }] : [];
    });
  const system = pages.filter((item) => item.group === 'system').map((page) => ({ page, children: [] }));
  return [
    { key: 'modules', nodes },
    { key: 'system', nodes: system },
  ].filter((section) => section.nodes.length > 0);
}

/** Усі сторінки меню по порядку: батько, далі його діти. */
export function sidebarPages(sections: SidebarSection[]): UiPage[] {
  return sections.flatMap((section) => section.nodes.flatMap((node) => [node.page, ...node.children]));
}
