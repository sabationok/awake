'use client';

import { useEffect, useRef } from 'react';
import { Button } from './button';

/**
 * @ui ConfirmDialog
 * @spec Підтвердження дії: модальний діалог з текстом. Ліворуч «Скасувати», праворуч OK (червоний для небезпечних).
 * Escape і клік по фону — скасування.
 * @keywords confirm, dialog, modal, alert, danger, ok, cancel
 */
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  text: string;
  ok: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, text, ok, danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
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
        <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5 shadow-lg">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[17px] font-semibold">{title}</h2>
            {text && <p className="text-[13px] text-secondary">{text}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="plain" onClick={onCancel} className="flex-1">
              Скасувати
            </Button>
            <Button variant={danger ? 'danger' : 'accent'} onClick={onConfirm} className="flex-1">
              {ok}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
