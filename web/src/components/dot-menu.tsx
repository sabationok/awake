'use client';

import { useRef, type ReactNode } from 'react';
import * as DM from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * @ui DotMenu
 * @spec Кнопка «⋯» з випадним меню. Меню — оверлей (portal): не розсуває картку. Пункт сірий, якщо вимкнений,
 * і показує hint другим рядком. Кольори пунктів: default — сірий, accent — синій, warn — помаранчевий, danger — червоний.
 * @keywords menu, dropdown, more, actions, context, overflow
 */
export type DotMenuVariant = 'default' | 'accent' | 'warn' | 'danger';

export interface DotMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  variant: DotMenuVariant;
  disabled?: boolean;
  hint?: string;
  onSelect: () => void;
}

const TEXT: Record<DotMenuVariant, string> = {
  default: 'text-label',
  accent: 'text-accent',
  warn: 'text-orange',
  danger: 'text-red',
};

const ROW =
  'flex cursor-default select-none items-start gap-2.5 rounded-lg px-2.5 py-2 text-[15px] outline-none data-[highlighted]:bg-[color-mix(in_srgb,var(--gray)_14%,transparent)] data-[disabled]:pointer-events-none data-[disabled]:opacity-40';

export function DotMenu({ items, label = 'Дії', disabled }: { items: DotMenuItem[]; label?: string; disabled?: boolean }) {
  // Пункт, що відкриває діалог, не повертає фокус на кнопку меню: фокус іде в діалог.
  const picked = useRef(false);

  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          disabled={disabled}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-secondary transition-opacity active:opacity-70 disabled:opacity-40"
        >
          <MoreHorizontal size={18} />
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          align="end"
          sideOffset={4}
          collisionPadding={8}
          onCloseAutoFocus={(e) => {
            if (picked.current) e.preventDefault();
            picked.current = false;
          }}
          className="z-50 min-w-48 rounded-xl bg-surface p-1 shadow-lg shadow-[0_0_0_0.5px_var(--separator)]"
        >
          {items.map((item) => (
            <DM.Item
              key={item.id}
              disabled={item.disabled}
              onSelect={() => {
                picked.current = true;
                item.onSelect();
              }}
              className={cn(ROW, TEXT[item.variant])}
            >
              {item.icon && <span className="mt-0.5 grid size-4 shrink-0 place-items-center">{item.icon}</span>}
              <span className="flex min-w-0 flex-col">
                <span className="whitespace-nowrap">{item.label}</span>
                {item.hint && <span className="whitespace-normal text-[12px] text-secondary">{item.hint}</span>}
              </span>
            </DM.Item>
          ))}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
