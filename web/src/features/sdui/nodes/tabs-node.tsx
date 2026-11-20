'use client';

import { useState } from 'react';
import type { UiTabs } from '@awake/contracts';
import { cn } from '@/lib/cn';
import type { NodeProps } from '../sdui.types';
import { NodeView } from './node-view';

/** Сегментний перемикач і рядки вибраної вкладки. З `setting` вибір іде агентові як налаштування. */
export function TabsNode({ node, onEvent }: NodeProps<UiTabs>) {
  const [picked, setPicked] = useState(node.value ?? node.tabs[0]?.id);
  const current = node.tabs.find((tab) => tab.id === picked) ?? node.tabs[0];
  return (
    <>
      <div role="tablist" className="mx-4 my-2 flex rounded-lg bg-[color-mix(in_srgb,var(--gray)_18%,transparent)] p-0.5">
        {node.tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === current?.id}
            onClick={() => {
              setPicked(tab.id);
              if (node.setting) void onEvent({ type: 'setting', change: { ...node.setting, value: tab.id } });
            }}
            className={cn(
              'flex-1 rounded-md px-3 py-1 text-[13px]',
              tab.id === current?.id ? 'bg-surface text-label shadow-sm' : 'text-secondary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {current?.children.map((child) => <NodeView key={child.id} node={child} onEvent={onEvent} />)}
    </>
  );
}
