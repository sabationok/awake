'use client';
import { Menu, X } from 'lucide-react';
import { useRef } from 'react';
import { FlexRow } from '@/components/flex';
import type { SidebarSection } from '../lib/sidebar-sections';
import { SidebarTree } from './sidebar-tree';

interface MobileMenuProps {
  sections: SidebarSection[];
  activeId: string | undefined;
  /** Назва вибраної сторінки на кнопці меню. */
  activeTitle: string;
  onSelect: (id: string) => void;
}

/**
 * @ui MobileMenu
 * @spec Меню на вузькому екрані: кнопка з назвою поточної сторінки відкриває висувну панель зліва з тим самим
 * деревом, що й бічне меню (модулі складками, дочірні сторінки). Вибір сторінки закриває панель.
 * @keywords mobile menu, drawer, hamburger, navigation, sheet
 */
export function MobileMenu({ sections, activeId, activeTitle, onSelect }: MobileMenuProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="mx-4 mb-2 flex h-10 items-center gap-2 rounded-xl bg-surface px-3 text-[15px] font-medium text-label md:hidden"
        aria-haspopup="dialog"
      >
        <Menu size={18} className="text-accent" />
        <span className="truncate">{activeTitle}</span>
      </button>
      <dialog
        ref={dialog}
        aria-label="Меню"
        onClick={(event) => {
          // Клік по затемненню (сам <dialog>, не його вміст) закриває меню.
          if (event.target === dialog.current) close();
        }}
        className="m-0 h-dvh max-h-none w-[85vw] max-w-xs bg-bg p-0 text-label backdrop:bg-black/40 open:animate-[menu-in_180ms_ease-out]"
      >
        <div className="h-full overflow-y-auto px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <FlexRow justify="between" className="mb-2 px-2">
            <span className="text-[17px] font-semibold">Меню</span>
            <button type="button" onClick={close} aria-label="Закрити меню" className="flex size-9 items-center justify-center rounded-lg text-secondary">
              <X size={18} />
            </button>
          </FlexRow>
          <SidebarTree
            sections={sections}
            activeId={activeId}
            onSelect={(id) => {
              onSelect(id);
              close();
            }}
          />
        </div>
      </dialog>
    </>
  );
}
