'use client';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { RuntimeProvider, useToastQueue, type RuntimeValue, type SduiRuntime } from '@/sdui/runtime';

/**
 * Демо-режим Web UI (`next dev` з фікстурами): усі контролки живі, але жодна подія не виходить з браузера.
 * Налаштування і локальні значення живуть у пам'яті вкладки й скидаються при перезавантаженні.
 * У локальну збірку не потрапляє: там лише сервер.
 */
export function DemoProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, RuntimeValue>>({});
  const [locals, setLocals] = useState<Record<string, RuntimeValue>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const { toasts, toast } = useToastQueue();

  const send = useCallback<SduiRuntime['send']>(
    async (event, label) => {
      if (event.type === 'setting') {
        const { module, key, value } = event.change;
        setSettings((prev) => ({ ...prev, [`${module}:${key}`]: value }));
        toast('success', label ?? 'Налаштування змінено', 'Демо: змінено лише тут, на Mac не надіслано');
      } else {
        toast('info', label ?? 'Дію виконано', 'Демо: дію показано, на Mac не надіслано');
      }
    },
    [toast],
  );

  const store = useMemo<SduiRuntime>(
    () => ({
      mode: 'demo',
      setting: <T extends RuntimeValue>(module: string, key: string, fallback: T) => (settings[`${module}:${key}`] as T | undefined) ?? fallback,
      local: <T extends RuntimeValue>(id: string, fallback: T) => (locals[id] as T | undefined) ?? fallback,
      setLocal: (id, value) => setLocals((prev) => ({ ...prev, [id]: value })),
      dismissed: (id) => hidden.has(id),
      dismiss: (id) => setHidden((prev) => new Set(prev).add(id)),
      send,
      toast,
      toasts,
    }),
    [settings, locals, hidden, send, toast, toasts],
  );

  return <RuntimeProvider value={store}>{children}</RuntimeProvider>;
}
