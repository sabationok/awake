'use client';
import type { ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { UiLocalAccess, UiTree } from '@awake/contracts';
import { cn } from '@/lib/cn';
import { Button } from '@/components/button';
import { FlexBox, FlexRow } from '@/components/flex';
import { Group } from '@/components/group';
import { KeyValueRow } from '@/components/key-value-row';
import { PageFrame } from '@/components/page-frame';
import { StatusDot } from '@/components/status-dot';
import { useEventScope } from '../hooks/use-event-scope';
import { sidebarPages, sidebarSections } from '../lib/sidebar-sections';
import { NodeView } from '../nodes/node-view';
import { MobileMenu } from './mobile-menu';
import { SidebarTree } from './sidebar-tree';
import type { SduiEventHandler, SduiMode } from '../sdui.types';

const OFFLINE_NOTICE = 'Mac офлайн або ще не надіслав інтерфейс';
const NO_SEND: SduiEventHandler = async () => {};
const CONNECTION_LABEL: Record<SduiMode, string> = { direct: 'Напряму з Mac', relay: 'Через relay', readonly: 'Лише перегляд' };
const CONNECTION_CLASS: Record<SduiMode, string> = { direct: 'text-green', relay: 'text-green', readonly: '' };
const OFFLINE_LABEL = "Немає з'єднання з Mac";
const CERT_HINT = 'Встанови сертифікат на цьому пристрої і довір йому, тоді керування запрацює.';

interface AppShellProps {
  tree: UiTree | null;
  send?: SduiEventHandler;
  /** Web UI на Vercel: режим зв'язку з Mac у шапці. На локальному Web UI не задається. */
  mode?: SduiMode;
  directError?: boolean;
  accessory?: ReactNode;
}

/**
 * Каркас: бічне меню на ≥ md, висувне меню на менших екранах; обидва — те саме дерево, що й у Mac-аппці.
 * Вибрана сторінка живе в ?page=<id>; якщо її немає в дереві, беремо першу.
 */
export function AppShell({ tree, send, mode, directError = false, accessory }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = useEventScope(send ?? NO_SEND);

  const sections = sidebarSections(tree);
  const pages = sidebarPages(sections);
  const requested = searchParams.get('page');
  const page = pages.find((item) => item.id === requested) ?? pages[0];

  const select = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const title = tree?.app.title ?? 'MaControl';
  const onlineTone = tree?.app.online ? 'green' : 'gray';
  const local = tree?.app.local ?? null;
  const offline = mode === 'readonly' && directError && local !== null;

  return (
    <FlexRow align="stretch" gap="none" className="min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto border-r border-separator bg-surface/70 px-3 py-4 backdrop-blur-xl md:block">
        <SidebarTree sections={sections} activeId={page?.id} onSelect={select} />
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

        <MobileMenu sections={sections} activeId={page?.id} activeTitle={page?.title ?? title} onSelect={select} />

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

/** Стан зв'язку з Mac, посилання на Web UI і кнопка сертифіката, якщо прямий доступ не працює. */
function ConnectionStatus({ mode, offline, local }: { mode: SduiMode; offline: boolean; local: UiLocalAccess | null }) {
  return (
    <>
      <span className={cn('ml-auto shrink-0', CONNECTION_CLASS[mode])}>{offline ? OFFLINE_LABEL : CONNECTION_LABEL[mode]}</span>
      {local && (
        <a href={`${local.url}/#p=${local.code}`} className="shrink-0 font-medium text-accent">
          Web UI на Mac
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
  link.download = 'MaControl-Local-CA.crt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
