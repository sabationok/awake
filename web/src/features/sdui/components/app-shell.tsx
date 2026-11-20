'use client';
import type { ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { UiPage, UiTree } from '@awake/contracts';
import { cn } from '@/lib/cn';
import { FlexBox, FlexRow } from '@/components/flex';
import { Group } from '@/components/group';
import { KeyValueRow } from '@/components/key-value-row';
import { PageFrame } from '@/components/page-frame';
import { StatusDot } from '@/components/status-dot';
import { useEventScope } from '../hooks/use-event-scope';
import { NodeView } from '../nodes/node-view';
import { SduiIcon } from '../nodes/sdui-icon';
import type { SduiEventHandler } from '../sdui.types';

const GROUP_ORDER: UiPage['group'][] = ['modules', 'system'];
const GROUP_CLASS: Record<UiPage['group'], string> = {
  modules: '',
  system: 'mt-4 border-t border-separator pt-4',
};
const OFFLINE_NOTICE = 'Mac офлайн або ще не надіслав інтерфейс';

interface AppShellProps {
  tree: UiTree | null;
  send: SduiEventHandler;
  /** Дашборд на Vercel: керування вимкнене, у шапці посилання на пульт самого Mac. */
  readOnly?: boolean;
  accessory?: ReactNode;
}

/**
 * Каркас: бічне меню на ≥ md, смужка сторінок на менших екранах.
 * Вибрана сторінка живе в ?page=<id>; якщо її немає в дереві, беремо першу.
 */
export function AppShell({ tree, send, readOnly = false, accessory }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = useEventScope(send);

  const pages = tree?.pages ?? [];
  const requested = searchParams.get('page');
  const page = pages.find((item) => item.id === requested) ?? pages[0];
  const groups = GROUP_ORDER.map((group) => ({ group, items: pages.filter((item) => item.group === group) })).filter(
    ({ items }) => items.length > 0,
  );

  const select = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const title = tree?.app.title ?? 'MacCC';
  const onlineTone = tree?.app.online ? 'green' : 'gray';

  return (
    <FlexRow align="stretch" gap="none" className="min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto border-r border-separator bg-surface/70 px-3 py-4 backdrop-blur-xl md:block">
        <FlexBox gap="none">
          {groups.map(({ group, items }) => (
            <FlexBox key={group} gap="xs" className={GROUP_CLASS[group]}>
              {items.map((item) => (
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
            {readOnly && <RemoteControlLink url={tree?.app.localUrl ?? null} />}
          </FlexRow>
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

/** На Vercel: перехід на пульт агента в довіреній Wi-Fi, інакше пояснення, чому лише перегляд. */
function RemoteControlLink({ url }: { url: string | null }) {
  if (!url) return <span className="ml-auto shrink-0">Лише перегляд</span>;
  return (
    <a href={url} className="ml-auto shrink-0 font-medium text-accent">
      Відкрити пульт на Mac
    </a>
  );
}
