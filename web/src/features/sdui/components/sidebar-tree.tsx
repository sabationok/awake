'use client';
import { ChevronRight } from 'lucide-react';
import { FlexBox, FlexRow } from '@/components/flex';
import { cn } from '@/lib/cn';
import { useFoldedNodes } from '../hooks/use-folded-nodes';
import type { SidebarNode, SidebarSection } from '../lib/sidebar-sections';
import { SduiIcon } from '../nodes/sdui-icon';

const ITEM_CLASS = 'flex min-h-9 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[15px] transition-colors';
const ACTIVE_CLASS = 'bg-accent font-medium text-white';
const IDLE_CLASS = 'text-label hover:bg-[color-mix(in_srgb,var(--gray)_16%,transparent)]';

interface SidebarTreeProps {
  sections: SidebarSection[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
}

/**
 * @ui SidebarTree
 * @spec Меню як у Mac-аппці: модулі складками з дочірніми сторінками (другий рівень без іконок), групи розділені лінією,
 * вибрана сторінка — синім. Те саме дерево і на широкому екрані, і в мобільному меню.
 * @keywords sidebar, menu, navigation, tree, disclosure, collapsible
 */
export function SidebarTree({ sections, activeId, onSelect }: SidebarTreeProps) {
  const folding = useFoldedNodes();
  return (
    <nav aria-label="Сторінки">
      <FlexBox gap="none">
        {sections.map((section, index) => (
          <FlexBox key={section.key} gap="xs" className={cn(index > 0 && 'mt-3 border-t border-separator pt-3')}>
            {section.nodes.map((node) => (
              <SidebarTreeNode
                key={node.page.id}
                node={node}
                activeId={activeId}
                onSelect={onSelect}
                folded={folding.isFolded(node.page.id)}
                onToggle={() => folding.toggle(node.page.id)}
              />
            ))}
          </FlexBox>
        ))}
      </FlexBox>
    </nav>
  );
}

interface SidebarTreeNodeProps {
  node: SidebarNode;
  activeId: string | undefined;
  onSelect: (id: string) => void;
  folded: boolean;
  onToggle: () => void;
}

function SidebarTreeNode({ node, activeId, onSelect, folded, onToggle }: SidebarTreeNodeProps) {
  const { page, children } = node;
  const hasChildren = children.length > 0;
  return (
    <FlexBox gap="xs">
      <FlexRow gap="xs">
        <button
          type="button"
          aria-current={page.id === activeId ? 'page' : undefined}
          onClick={() => onSelect(page.id)}
          className={cn(ITEM_CLASS, page.id === activeId ? ACTIVE_CLASS : IDLE_CLASS)}
        >
          <SduiIcon icon={page.icon} />
          <span className="truncate">{page.title}</span>
        </button>
        {hasChildren && (
          <button
            type="button"
            aria-expanded={!folded}
            aria-label={folded ? `Розгорнути ${page.title}` : `Згорнути ${page.title}`}
            onClick={onToggle}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-secondary hover:bg-[color-mix(in_srgb,var(--gray)_16%,transparent)]"
          >
            <ChevronRight size={16} className={cn('transition-transform', !folded && 'rotate-90')} />
          </button>
        )}
      </FlexRow>
      {hasChildren && !folded && (
        <FlexBox gap="xs" className="pl-9">
          {children.map((child) => (
            <button
              key={child.id}
              type="button"
              aria-current={child.id === activeId ? 'page' : undefined}
              onClick={() => onSelect(child.id)}
              className={cn(ITEM_CLASS, child.id === activeId ? ACTIVE_CLASS : IDLE_CLASS)}
            >
              <span className="truncate">{child.title}</span>
            </button>
          ))}
        </FlexBox>
      )}
    </FlexBox>
  );
}
