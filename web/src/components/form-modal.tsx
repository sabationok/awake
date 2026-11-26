'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from './button';
import { Select } from './select';

/**
 * @ui FormModal
 * @spec Модалка з кількома полями: поля, помилка червоним під ними, ліворуч «Скасувати», праворуч кнопка відправки.
 * Вміст монтується при відкритті, тож стан полів скидається сам. Escape і клік по фону — скасування.
 * @keywords form, modal, dialog, fields, input, submit, edit
 */
export interface FormField {
  name: string;
  label: string;
  kind: 'text' | 'password' | 'url' | 'select';
  value?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  minLength?: number;
  options?: { value: string; label: string; disabled?: boolean }[];
}

interface FormModalProps {
  open: boolean;
  title?: string;
  fields: FormField[];
  submit?: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}

export function FormModal({ open, title, fields, submit = 'Зберегти', busy = false, error, onSubmit, onCancel }: FormModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-sm bg-transparent p-0 text-label backdrop:bg-black/30"
    >
      {open && (
        <FormBody title={title} fields={fields} submit={submit} busy={busy} error={error} onSubmit={onSubmit} onCancel={onCancel} />
      )}
    </dialog>
  );
}

function FormBody({ title, fields, submit, busy, error, onSubmit, onCancel }: Omit<FormModalProps, 'open'>) {
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(fields));

  const handle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handle} className="flex flex-col gap-4 rounded-2xl bg-surface p-5 shadow-lg">
      {title && <h2 className="text-[17px] font-semibold">{title}</h2>}
      <div className="flex flex-col gap-3">
        {fields.map((field) => (
          <label key={field.name} className="flex flex-col gap-1">
            <span className="text-[13px] text-secondary">{field.label}</span>
            <FieldControl field={field} value={values[field.name] ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, [field.name]: v }))} />
            {field.hint && <span className="text-[12px] text-secondary">{field.hint}</span>}
          </label>
        ))}
      </div>
      {error && <p className="text-[13px] text-red">{error}</p>}
      <div className="flex gap-2">
        <Button variant="plain" onClick={onCancel} className="flex-1">
          Скасувати
        </Button>
        <Button type="submit" variant="accent" disabled={busy} className="flex-1">
          {submit}
        </Button>
      </div>
    </form>
  );
}

/** Поле форми: текст, пароль, URL або вибір. Спільне з інлайн-полем. */
export function FieldControl({
  field,
  value,
  onChange,
  autoFocus = false,
}: {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  if (field.kind === 'select') {
    return (
      <Select className="h-9 w-full" autoFocus={autoFocus} required={field.required} value={value} onChange={(e) => onChange(e.target.value)}>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }
  return (
    <input
      type={field.kind}
      name={field.name}
      value={value}
      placeholder={field.placeholder}
      required={field.required}
      minLength={field.minLength}
      autoFocus={autoFocus}
      autoComplete={field.kind === 'password' ? 'new-password' : 'off'}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md bg-[color-mix(in_srgb,var(--gray)_18%,transparent)] px-3 text-[15px] text-label outline-none placeholder:text-secondary"
    />
  );
}

export function initialValues(fields: FormField[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.name, field.value ?? '']));
}
