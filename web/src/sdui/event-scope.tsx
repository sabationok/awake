'use client';
import type { UiEvent } from '@awake/contracts';
import { createContext, useCallback, useContext, useState } from 'react';
import { errorText, useRuntime } from './runtime';

type ScopedSend = (event: UiEvent, label?: string) => Promise<void>;

const ScopeContext = createContext<ScopedSend | null>(null);

/** Зона помилок секції: її контроли шлють сюди, а відхилена дія з'являється в підписі секції. */
export const EventScope = ScopeContext.Provider;

/**
 * Відправка з найближчої зони. Секція показує помилку в підписі; поза секцією помилка йде в тост.
 * Помилку кидає далі, щоб форма, що її викликала, лишилась відкритою з текстом.
 */
export function useScopedSend(): ScopedSend {
  const scoped = useContext(ScopeContext);
  const { send, toast } = useRuntime();
  const page = useCallback<ScopedSend>(
    async (event, label) => {
      try {
        await send(event, label);
      } catch (e) {
        toast('error', label ?? 'Не вдалося виконати дію', errorText(e));
        throw e;
      }
    },
    [send, toast],
  );
  return scoped ?? page;
}

/** Зона секції: тримає останню помилку її дій. Нова дія її стирає. Батьківська зона помилку вже не бачить. */
export function useEventScope() {
  const { send } = useRuntime();
  const [error, setError] = useState<string | null>(null);
  const run = useCallback<ScopedSend>(
    async (event, label) => {
      setError(null);
      try {
        await send(event, label);
      } catch (e) {
        setError(errorText(e));
        throw e;
      }
    },
    [send],
  );
  return { run, error };
}

/**
 * Прапорець «дія летить»: контрол блокується, кнопка стає лоадером, поки сервер не відповів і дерево не перечиталось.
 * `send` не кидає: повертає текст помилки або null (зона вже показала її).
 */
export function useBusySend() {
  const send = useScopedSend();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (event: UiEvent, label?: string): Promise<string | null> => {
      setBusy(true);
      try {
        await send(event, label);
        return null;
      } catch (e) {
        return errorText(e);
      } finally {
        setBusy(false);
      }
    },
    [send],
  );
  return { send: run, busy };
}
