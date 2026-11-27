'use client';
import type { UiAction, UiEvent } from '@awake/contracts';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Value = string | number | boolean;

export interface DemoToast {
  id: number;
  title: string;
  detail: string;
}

interface DemoStore {
  /** Значення налаштування з локальною зміною поверх fixture. */
  setting<T extends Value>(module: string, key: string, fallback: T): T;
  /** Локальний стан контролки без налаштування (перемикач on/off, повзунок). */
  local<T extends Value>(id: string, fallback: T): T;
  setLocal(id: string, value: Value): void;
  dismissed(id: string): boolean;
  dismiss(id: string): void;
  /** «Відправка» події: стан міняється локально, на сервер нічого не йде, зверху — тост. */
  send(event: UiEvent, label?: string): void;
  toasts: DemoToast[];
}

const DemoContext = createContext<DemoStore | null>(null);

function describe(action: UiAction): string {
  const params = action.params ? ` ${JSON.stringify(action.params)}` : '';
  return `${action.module}.${action.name}${params}`;
}

/**
 * Демо-режим Umbra: усі контролки живі, але жодна подія не виходить з браузера.
 * Налаштування і локальні значення живуть у пам'яті вкладки й скидаються при перезавантаженні.
 */
export function DemoProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, Value>>({});
  const [locals, setLocals] = useState<Record<string, Value>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<DemoToast[]>([]);
  const seq = useRef(0);

  const toast = useCallback((title: string, detail: string) => {
    const id = ++seq.current;
    setToasts((list) => [...list.slice(-2), { id, title, detail }]);
    setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), 3200);
  }, []);

  const send = useCallback(
    (event: UiEvent, label?: string) => {
      if (event.type === 'setting') {
        const { module, key, value } = event.change;
        setSettings((prev) => ({ ...prev, [`${module}:${key}`]: value }));
        toast(label ?? 'Налаштування змінено', `${module}.${key} = ${String(value)} · демо, не надіслано`);
      } else {
        toast(label ?? 'Дію виконано', `${describe(event.action)} · демо, не надіслано`);
      }
    },
    [toast],
  );

  const store = useMemo<DemoStore>(
    () => ({
      setting: <T extends Value>(module: string, key: string, fallback: T) => (settings[`${module}:${key}`] as T | undefined) ?? fallback,
      local: <T extends Value>(id: string, fallback: T) => (locals[id] as T | undefined) ?? fallback,
      setLocal: (id, value) => setLocals((prev) => ({ ...prev, [id]: value })),
      dismissed: (id) => hidden.has(id),
      dismiss: (id) => setHidden((prev) => new Set(prev).add(id)),
      send,
      toasts,
    }),
    [settings, locals, hidden, send, toasts],
  );

  return <DemoContext.Provider value={store}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoStore {
  const store = useContext(DemoContext);
  if (!store) throw new Error('useDemo outside DemoProvider');
  return store;
}
