'use client';
import type { UiAction, UiButton, UiConfirm, UiEvent, UiForm, UiMenuItem } from '@awake/contracts';
import { useState, type ReactNode } from 'react';
import { Button, Dialog, Select, type ButtonVariant } from '@/ui/primitives';
import { useBusySend } from './event-scope';

export interface RunnableAction {
  label: string;
  action: UiAction;
  variant: ButtonVariant;
  confirm?: UiConfirm;
  form?: UiForm;
}

export function fromButton(button: UiButton): RunnableAction {
  const variant: ButtonVariant = button.variant === 'filled' ? 'accent' : button.variant === 'destructive' ? 'danger' : 'default';
  return {
    label: button.label,
    action: button.action,
    variant,
    confirm: button.confirm ? { title: button.label, text: button.confirm, ok: button.label } : undefined,
  };
}

export function fromMenuItem(item: UiMenuItem): RunnableAction {
  return { label: item.label, action: item.action, variant: item.variant, confirm: item.confirm, form: item.form };
}

/**
 * Запуск дії з підтвердженням або формою. Повертає `run`, діалог, який треба вставити в розмітку, і `busy`:
 * поки дія летить, кнопка-тригер стає лоадером. Помилку показує зона (підпис секції або тост); форма з помилкою
 * лишається відкритою і показує текст сервера.
 */
export function useRunAction(): [(item: RunnableAction) => void, ReactNode, boolean] {
  const { send, busy } = useBusySend();
  const [pending, setPending] = useState<RunnableAction | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const close = () => setPending(null);
  const eventOf = (item: RunnableAction, extra?: Record<string, string>): UiEvent => ({
    type: 'action',
    action: { ...item.action, params: { ...item.action.params, ...extra } },
  });
  const fire = (item: RunnableAction) => {
    close();
    void send(eventOf(item), item.label);
  };
  const submit = async (item: RunnableAction, values: Record<string, string>) => {
    setFormError(null);
    const error = await send(eventOf(item, values), item.label);
    if (error) setFormError(error);
    else close();
  };
  const run = (item: RunnableAction) => {
    if (busy) return;
    setFormError(null);
    if (item.confirm || item.form) setPending(item);
    else fire(item);
  };

  let dialog: ReactNode = null;
  if (pending?.form) {
    dialog = <FormDialog item={pending} form={pending.form} busy={busy} error={formError} onClose={close} onSubmit={(values) => void submit(pending, values)} />;
  } else if (pending?.confirm) {
    const { title, text, ok } = pending.confirm;
    dialog = (
      <Dialog
        title={title}
        onClose={close}
        actions={
          <>
            <Button variant="ghost" onClick={close}>Скасувати</Button>
            <Button variant={pending.variant === 'default' ? 'accent' : pending.variant} onClick={() => fire(pending)}>{ok}</Button>
          </>
        }
      >
        <p>{text}</p>
      </Dialog>
    );
  }
  return [run, dialog, busy];
}

function FormDialog({ item, form, busy, error: serverError, onClose, onSubmit }: { item: RunnableAction; form: UiForm; busy: boolean; error: string | null; onClose: () => void; onSubmit: (values: Record<string, string>) => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(form.fields.map((f) => [f.name, f.value ?? f.options?.[0]?.value ?? ''])));
  const [touched, setTouched] = useState(false);
  const errors = Object.fromEntries(
    form.fields.map((f) => {
      const v = values[f.name] ?? '';
      if (f.required && !v.trim()) return [f.name, 'Обовʼязкове поле'];
      if (f.minLength && v.length < f.minLength) return [f.name, `Щонайменше ${f.minLength} символів`];
      if (f.sameAs && v !== values[f.sameAs]) return [f.name, 'Значення не збігаються'];
      return [f.name, null];
    }),
  ) as Record<string, string | null>;
  const valid = Object.values(errors).every((e) => e === null);

  return (
    <Dialog
      title={form.title ?? item.label}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>Скасувати</Button>
          <Button
            variant="accent"
            busy={busy}
            onClick={() => {
              setTouched(true);
              if (valid) onSubmit(values);
            }}
          >
            {form.submit ?? 'Зберегти'}
          </Button>
        </>
      }
    >
      <form
        style={{ display: 'grid', gap: 12 }}
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (valid && !busy) onSubmit(values);
        }}
      >
        {form.fields.map((f) => {
          const id = `form-${item.action.module}-${item.action.name}-${f.name}`;
          const error = touched || (f.sameAs && values[f.name]) ? errors[f.name] : null;
          return (
            <div key={f.name} className="u-field" data-error={error ? 'true' : undefined}>
              <label htmlFor={id}>{f.label}</label>
              {f.kind === 'select' ? (
                <Select id={id} label={f.label} value={values[f.name] ?? ''} options={f.options ?? []} onChange={(v) => setValues((p) => ({ ...p, [f.name]: v }))} />
              ) : (
                <input
                  id={id}
                  className="u-input"
                  type={f.kind === 'password' ? 'password' : f.kind === 'url' ? 'url' : 'text'}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ''}
                  onChange={(event) => setValues((p) => ({ ...p, [f.name]: event.target.value }))}
                />
              )}
              {error ? <small>{error}</small> : f.hint ? <small>{f.hint}</small> : null}
            </div>
          );
        })}
        {serverError ? (
          <p className="u-form-error" role="alert">
            {serverError}
          </p>
        ) : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
