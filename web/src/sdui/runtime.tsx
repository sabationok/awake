'use client';
import type { UiEvent } from '@macontrol/contracts';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export type RuntimeValue = string | number | boolean;

/** Тип запису: від нього тон і іконка тоста. */
export type LogType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  type: LogType;
  title: string;
  /** Коментар під заголовком, людською мовою (без JSON і технічних ключів). */
  detail: string;
}

/**
 * Як рендерер говорить із сервером.
 * - live: локальний агент на Mac; показуємо лише те, що він повернув, події йдуть у його API.
 * - readonly: Vercel; сторінки лише для перегляду, нічого не надсилається.
 * - demo: `next dev` з фікстурами; зміни живуть у пам'яті вкладки, на сервер нічого не йде.
 */
export type RuntimeMode = 'live' | 'readonly' | 'demo';

export interface SduiRuntime {
  mode: RuntimeMode;
  /** Подія на сервер. Чекає відповіді (і перечитування сторінки); помилку кидає з текстом для людини. */
  send(event: UiEvent, label?: string): Promise<void>;
  /** Значення налаштування. live / readonly: те, що дав сервер; demo: локальна зміна поверх фікстури. */
  setting<T extends RuntimeValue>(module: string, key: string, fallback: T): T;
  /** Значення контролки без налаштування (перемикач on/off, вибір з дією). Поза demo — те, що дав сервер. */
  local<T extends RuntimeValue>(id: string, fallback: T): T;
  setLocal(id: string, value: RuntimeValue): void;
  /** Сповіщення, сховане лише в demo; live чекає, поки сервер сам його прибере. */
  dismissed(id: string): boolean;
  dismiss(id: string): void;
  toast(type: LogType, title: string, detail: string): void;
  toasts: Toast[];
}

const RuntimeContext = createContext<SduiRuntime | null>(null);

export function useRuntime(): SduiRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('useRuntime outside a runtime provider');
  return runtime;
}

export const RuntimeProvider = RuntimeContext.Provider;

/** Тости на 3,2 с, не більше трьох. Спільні для всіх режимів. */
export function useToastQueue() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const toast = useCallback((type: LogType, title: string, detail: string) => {
    const id = ++seq.current;
    setToasts((list) => [...list.slice(-2), { id, type, title, detail }]);
    setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), type === 'error' ? 6000 : 3200);
  }, []);
  return { toasts, toast };
}

const keep = <T,>(_id: string, fallback: T) => fallback;
const noop = () => undefined;

/**
 * Рантайм без власного стану: значення лише зі сторінок сервера. `send` — подія в агент (live) або відмова (readonly).
 */
export function ServerRuntimeProvider({ mode, send, children }: { mode: 'live' | 'readonly'; send?: (event: UiEvent) => Promise<void>; children: ReactNode }) {
  const { toasts, toast } = useToastQueue();
  const runtime = useMemo<SduiRuntime>(
    () => ({
      mode,
      send: async (event) => {
        if (!send) throw new Error('Лише перегляд: дії доступні у Web UI на Mac');
        await send(event);
      },
      setting: <T extends RuntimeValue>(_module: string, _key: string, fallback: T) => fallback,
      local: keep,
      setLocal: noop,
      dismissed: () => false,
      dismiss: noop,
      toast,
      toasts,
    }),
    [mode, send, toast, toasts],
  );
  return <RuntimeProvider value={runtime}>{children}</RuntimeProvider>;
}

export function errorText(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Не вдалося виконати дію';
}
