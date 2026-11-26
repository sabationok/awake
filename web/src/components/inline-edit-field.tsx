'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from './button';
import { FieldControl, type FormField } from './form-modal';

/**
 * @ui InlineEditField
 * @spec Одне поле на місці рядка: поле, ліворуч «Скасувати», праворуч кнопка відправки. Фокус одразу в поле,
 * Enter відправляє, Escape скасовує.
 * @keywords inline, edit, field, input, form, save, cancel
 */
interface InlineEditFieldProps {
  field: FormField;
  submit?: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function InlineEditField({ field, submit = 'Зберегти', busy = false, error, onSubmit, onCancel }: InlineEditFieldProps) {
  const [value, setValue] = useState(field.value ?? '');

  const handle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(value);
  };

  const keyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Escape') onCancel();
  };

  return (
    <form onSubmit={handle} onKeyDown={keyDown} className="flex flex-col gap-2">
      <FieldControl field={{ ...field, placeholder: field.placeholder ?? field.label }} value={value} onChange={setValue} autoFocus />
      {error && <p className="text-[13px] text-red">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="plain" onClick={onCancel} className="h-8 px-3 text-[13px]">
          Скасувати
        </Button>
        <Button type="submit" variant="accent" disabled={busy} className="h-8 px-3 text-[13px]">
          {submit}
        </Button>
      </div>
    </form>
  );
}
