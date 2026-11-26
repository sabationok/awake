'use client';

import { useState } from 'react';
import type { UiItem, UiMenuItem } from '@awake/contracts';
import { CopyButton } from '@/components/copy-button';
import { FlexRow } from '@/components/flex';
import { InlineEditField } from '@/components/inline-edit-field';
import { StatusBadge } from '@/components/status-badge';
import { Tag } from '@/components/tag';
import { useBusyEvent } from '../hooks/use-busy-event';
import type { NodeProps } from '../sdui.types';
import { ActionSet } from './action-set';
import { ControlView } from './control-view';
import { SduiIcon } from './sdui-icon';

/**
 * Картка елемента: заголовок (назва, статус, керування, дії), теги, значення для копіювання, коментар.
 * Інлайн-форма з одним полем замінює коментар.
 */
export function ItemNode({ node, onEvent }: NodeProps<UiItem>) {
  const [inline, setInline] = useState<UiMenuItem | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const { send, busy } = useBusyEvent(onEvent);

  const submitInline = async (value: string) => {
    const field = inline?.form?.fields[0];
    if (!inline || !field) return;
    setInlineError(null);
    const error = await send({ type: 'action', action: { ...inline.action, params: { ...inline.action.params, [field.name]: value } } });
    if (error) setInlineError(error);
    else setInline(null);
  };

  const inlineField = inline?.form?.fields[0];

  return (
    <div className="flex flex-col gap-1.5 px-4 py-2.5">
      <FlexRow gap="sm">
        <FlexRow gap="sm" className="min-w-0 flex-1">
          {node.icon && <SduiIcon icon={node.icon} />}
          <span className="truncate text-[15px] font-medium">{node.title}</span>
        </FlexRow>
        <FlexRow gap="sm" className="shrink-0">
          {node.status && <StatusBadge label={node.status.label} tone={node.status.tone} pulse={node.status.pulse} />}
          {node.control && <ControlView control={node.control} label={node.title} onEvent={onEvent} />}
          {node.actions && (
            <ActionSet
              items={node.actions}
              onEvent={onEvent}
              onInlineForm={(item) => {
                setInlineError(null);
                setInline(item);
              }}
            />
          )}
        </FlexRow>
      </FlexRow>

      {node.tags && node.tags.length > 0 && (
        <FlexRow gap="xs" className="flex-wrap">
          {node.tags.map((tag) => (
            <Tag key={tag.label} label={tag.label} tone={tag.tone} />
          ))}
        </FlexRow>
      )}

      {node.copy && (
        <FlexRow gap="xs" className="min-w-0">
          <span className="min-w-0 flex-1 break-all font-mono text-[13px] text-secondary">{node.copy.value}</span>
          <CopyButton value={node.copy.value} label={node.copy.label} />
        </FlexRow>
      )}

      {inline && inlineField ? (
        <InlineEditField
          field={inlineField}
          submit={inline.form?.submit}
          busy={busy}
          error={inlineError}
          onSubmit={(value) => void submitInline(value)}
          onCancel={() => {
            setInline(null);
            setInlineError(null);
          }}
        />
      ) : (
        node.comment && <p className="text-[12px] text-secondary">{node.comment}</p>
      )}
    </div>
  );
}
