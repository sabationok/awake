'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { UiMenuItem } from '@awake/contracts';
import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DotMenu, type DotMenuItem } from '@/components/dot-menu';
import { FormModal } from '@/components/form-modal';
import { useBusyEvent } from '../hooks/use-busy-event';
import { findSymbolIcon } from '../lib/symbol-icon-map';
import type { SduiEventHandler } from '../sdui.types';

/**
 * Набір дій елемента: 1 пункт — кнопка, 2+ — меню «⋯». Вимкнений (у т.ч. scope mac у web) не відкривається.
 * Підтвердження і форма йдуть через діалоги; інлайн-форма з одним полем — у батька (onInlineForm).
 */
interface ActionSetProps {
  items: UiMenuItem[];
  onEvent: SduiEventHandler;
  onInlineForm?: (item: UiMenuItem) => void;
}

type Pending = { kind: 'confirm' | 'form'; item: UiMenuItem };

export function ActionSet({ items, onEvent, onInlineForm }: ActionSetProps) {
  const { send, busy } = useBusyEvent(onEvent);
  const [pending, setPending] = useState<Pending | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (items.length === 0) return null;

  const isOff = (item: UiMenuItem) => item.scope === 'mac' || Boolean(item.disabled);

  const pick = (item: UiMenuItem) => {
    if (item.form && item.form.fields.length === 1 && onInlineForm) {
      onInlineForm(item);
      return;
    }
    if (item.form) {
      setFormError(null);
      setPending({ kind: 'form', item });
      return;
    }
    if (item.confirm) {
      setPending({ kind: 'confirm', item });
      return;
    }
    void send({ type: 'action', action: item.action });
  };

  const submitForm = async (values: Record<string, string>) => {
    if (pending?.kind !== 'form') return;
    setFormError(null);
    const error = await send({ type: 'action', action: { ...pending.item.action, params: { ...pending.item.action.params, ...values } } });
    if (error) setFormError(error);
    else setPending(null);
  };

  const confirmItem = pending?.kind === 'confirm' ? pending.item : undefined;
  const formItem = pending?.kind === 'form' ? pending.item : undefined;

  const dialogs = (
    <>
      <ConfirmDialog
        open={Boolean(confirmItem)}
        title={confirmItem?.confirm?.title ?? ''}
        text={confirmItem?.confirm?.text ?? ''}
        ok={confirmItem?.confirm?.ok ?? ''}
        danger={confirmItem?.variant === 'danger'}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (confirmItem) void send({ type: 'action', action: confirmItem.action });
          setPending(null);
        }}
      />
      <FormModal
        open={Boolean(formItem)}
        title={formItem?.form?.title}
        fields={formItem?.form?.fields ?? []}
        submit={formItem?.form?.submit}
        busy={busy}
        error={formError}
        onSubmit={submitForm}
        onCancel={() => setPending(null)}
      />
    </>
  );

  if (items.length === 1) {
    const item = items[0];
    return (
      <>
        <Button
          variant={item.variant}
          disabled={isOff(item) || busy}
          title={item.hint}
          onClick={() => pick(item)}
          className="h-8 px-3 text-[13px]"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : item.label}
        </Button>
        {dialogs}
      </>
    );
  }

  const menuItems: DotMenuItem[] = items.map((item) => {
    const Icon = item.icon ? findSymbolIcon(item.icon.symbol) : undefined;
    return {
      id: item.id,
      label: item.label,
      icon: Icon ? <Icon size={16} /> : undefined,
      variant: item.variant,
      disabled: isOff(item) || busy,
      hint: item.hint,
      onSelect: () => pick(item),
    };
  });

  return (
    <>
      <DotMenu items={menuItems} disabled={busy} />
      {dialogs}
    </>
  );
}
