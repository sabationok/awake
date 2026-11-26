'use client';

import { useState } from 'react';
import type { UiTabs } from '@awake/contracts';
import { Select } from '@/components/select';
import { cn } from '@/lib/cn';
import type { NodeProps } from '../sdui.types';
import { NodeView } from './node-view';

/** До 5 вкладок — сегмент, більше — дропдаун (spec 4.5a). Плашка вкладок окрема, прилипає при sticky. */
const SEGMENT_MAX = 5;

/** Вибір вкладки з сегмента або дропдауна; з `setting` вибір іде агентові як налаштування. */
export function TabsNode({ node, onEvent }: NodeProps<UiTabs>) {
  const [picked, setPicked] = useState(node.value ?? node.tabs[0]?.id);
  const current = node.tabs.find((tab) => tab.id === picked) ?? node.tabs[0];

  const choose = (id: string) => {
    setPicked(id);
    if (node.setting) void onEvent({ type: 'setting', change: { ...node.setting, value: id } }).catch(() => undefined);
  };

  return (
    <>
      <div className={cn('border-b border-separator bg-surface px-4 py-2', node.sticky && 'sticky top-0 z-10')}>
        {node.tabs.length > SEGMENT_MAX ? (
          <Select aria-label="Вкладка" value={current?.id} onChange={(e) => choose(e.target.value)}>
            {node.tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </Select>
        ) : (
          <div role="tablist" className="flex overflow-x-auto rounded-lg bg-[color-mix(in_srgb,var(--gray)_18%,transparent)] p-0.5">
            {node.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.id === current?.id}
                onClick={() => choose(tab.id)}
                className={cn(
                  'flex-1 shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-[13px]',
                  tab.id === current?.id ? 'bg-surface text-label shadow-sm' : 'text-secondary',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {current?.children.map((child) => <NodeView key={child.id} node={child} onEvent={onEvent} />)}
    </>
  );
}
