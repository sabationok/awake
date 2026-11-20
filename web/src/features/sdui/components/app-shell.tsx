'use client';
import type { ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { UiLocalAccess, UiPage, UiTree } from '@awake/contracts';
import { cn } from '@/lib/cn';
import { Button } from '@/components/button';
import { FlexBox, FlexRow } from '@/components/flex';
import { Group } from '@/components/group';
import { KeyValueRow } from '@/components/key-value-row';
import { PageFrame } from '@/components/page-frame';
import { StatusDot } from '@/components/status-dot';
import { useEventScope } from '../hooks/use-event-scope';
import { NodeView } from '../nodes/node-view';
import { SduiIcon } from '../nodes/sdui-icon';
import type { SduiEventHandler, SduiMode } from '../sdui.types';

const SEPARATED_CLASS = 'mt-4 border-t border-separator pt-4';
const OFFLINE_NOTICE = 'Mac офлайн або ще не надіслав інтерфейс';
const NO_SEND: SduiEventHandler = async () => {};
const CONNECTION_LABEL: Record<SduiMode, string> = { direct: 'Напряму з Mac', readonly: 'Лише перегляд' };
const CONNECTION_CLASS: Record<SduiMode, string> = { direct: 'text-green', readonly: '' };
const OFFLINE_LABEL = "Немає з'єднання з Mac";
const CERT_HINT = 'Встанови сертифікат на цьому пристрої і довір йому, тоді керування запрацює.';

interface AppShellProps {
  tree: UiTree | null;
  send?: SduiEventHandler;
  /** Дашборд на Vercel: режим зв'язку з Mac у шапці. На локальному пульті не задається. */
  mode?: SduiMode;
  directError?: boolean;
  accessory?: ReactNode;
}

interface SidebarSection {
  key: string;
  title?: string;
  items: UiPage[];
  separated?: boolean;
}

/**
 * Каркас: бічне меню на ≥ md, смужка сторінок на менших екранах.
 * Вибрана сторінка живе в ?page=<id>; якщо її немає в дереві, беремо першу.
 */
export function AppShell({ tree, send, mode, directError = false, accessory }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = useEventScope(send ?? NO_SEND);

  const sections = sidebarSections(tree);
  const pages = sections.flatMap((section) => section.items);
  const requested = searchParams.get('page');
  const page = pages.find((item) => item.id === requested) ?? pages[0];

  const select = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const title = tree?.app.title ?? 'MacCC';
  const onlineTone = tree?.app.online ? 'green' : 'gray';
  const local = tree?.app.local ?? null;
  const offline = mode === 'readonly' && directError && local !== null;

  return (
    <FlexRow align="stretch" gap="none" className="min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto border-r border-separator bg-surface/70 px-3 py-4 backdrop-blur-xl md:block">
        <FlexBox gap="none">
          {sections.map((section) => (
            <FlexBox key={section.key} gap="xs" className={section.separated ? SEPARATED_CLASS : undefined}>
              {section.title && (
                <p className="px-2 pt-2 text-[11px] font-medium tracking-wide text-secondary uppercase">{section.title}</p>
              )}
              {section.items.map((item) => (
                <SidebarItem key={item.id} page={item} active={item.id === page?.id} onSelect={() => select(item.id)} />
              ))}
            </FlexBox>
          ))}
        </FlexBox>
      </aside>

      <FlexBox gap="none" className="min-w-0 flex-1">
        <header className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
          <FlexRow gap="sm" className="text-[13px] text-secondary">
            <StatusDot tone={onlineTone} />
            <span className="font-semibold text-label">{title}</span>
            {tree && <span className="truncate">{tree.app.host}</span>}
            {mode && <ConnectionStatus mode={mode} offline={offline} local={local} />}
          </FlexRow>
          {offline && <p className="pt-1 text-[12px] text-secondary">{CERT_HINT}</p>}
        </header>

        <nav aria-label="Сторінки" className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
          {pages.map((item) => {
            const active = item.id === page?.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => select(item.id)}
                className={cn(
                  'h-8 shrink-0 rounded-full px-3 text-[13px] font-medium',
                  active ? 'bg-accent text-white' : 'bg-[color-mix(in_srgb,var(--gray)_18%,transparent)] text-label',
                )}
              >
                {item.title}
              </button>
            );
          })}
        </nav>

        <PageFrame title={page?.title ?? title} accessory={accessory}>
          {page ? (
            <>
              {page.children.map((child) => (
                <NodeView key={child.id} node={child} onEvent={scope.run} />
              ))}
              {scope.error && <p className="px-1 text-[12px] text-red">{scope.error}</p>}
            </>
          ) : (
            <Group>
              <KeyValueRow label={OFFLINE_NOTICE} />
            </Group>
          )}
        </PageFrame>
      </FlexBox>
    </FlexRow>
  );
}

/**
 * Бічне меню: модулі в порядку tree.modules з підписами, далі сторінки без відомого модуля
 * (без підпису), далі системні під розділювачем. Порожні секції не малюються.
 */
function sidebarSections(tree: UiTree | null): SidebarSection[] {
  const pages = tree?.pages ?? [];
  const modules = tree?.modules ?? [];
  const moduleIds = new Set(modules.map((module) => module.id));
  const modulePages = pages.filter((item) => item.group === 'modules');
  const sections: SidebarSection[] = modules.map((module) => ({
    key: module.id,
    title: module.title,
    items: modulePages.filter((item) => item.module === module.id),
  }));
  sections.push({ key: 'unknown-module', items: modulePages.filter((item) => !moduleIds.has(item.module)) });
  sections.push({ key: 'system', items: pages.filter((item) => item.group === 'system'), separated: true });
  return sections.filter((section) => section.items.length > 0);
}

function SidebarItem({ page, active, onSelect }: { page: UiPage; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[15px] transition-colors',
        active ? 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] font-medium' : 'hover:bg-[color-mix(in_srgb,var(--gray)_16%,transparent)]',
      )}
    >
      <SduiIcon icon={page.icon} />
      <span className="truncate">{page.title}</span>
    </button>
  );
}

/** Стан зв'язку з Mac, посилання на пульт і кнопка сертифіката, якщо прямий доступ не працює. */
function ConnectionStatus({ mode, offline, local }: { mode: SduiMode; offline: boolean; local: UiLocalAccess | null }) {
  return (
    <>
      <span className={cn('ml-auto shrink-0', CONNECTION_CLASS[mode])}>{offline ? OFFLINE_LABEL : CONNECTION_LABEL[mode]}</span>
      {local && (
        <a href={`${local.url}/#p=${local.code}`} className="shrink-0 font-medium text-accent">
          Пульт на Mac
        </a>
      )}
      {offline && local && (
        <Button variant="plain" className="h-7 shrink-0 px-2.5 text-[13px]" onClick={() => downloadCa(local.ca)}>
          Сертифікат
        </Button>
      )}
    </>
  );
}

/** PEM локального CA як файл: пристрій довіряє йому один раз. */
function downloadCa(ca: string) {
  const url = URL.createObjectURL(new Blob([ca], { type: 'application/x-x509-ca-cert' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'MacCC-Local-CA.crt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
