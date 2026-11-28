'use client';
import { applyStatePatch } from '@macontrol/contracts';
import type { AppState, LiveMessage, UiNotify } from '@macontrol/contracts';
import { createContext, useContext, useSyncExternalStore } from 'react';

/**
 * Копія AppState клієнта (скіл `sdui` «Client store»): поза React, `subscribe` / `getSnapshot`. Патчі зберігають
 * посилання незмінених гілок. Сервер — єдиний власник: сюди пишуть лише повідомлення з каналу.
 */
export class AppStateStore {
  private _state: AppState | undefined;
  private _rev = 0;
  private readonly _listeners = new Set<() => void>();
  private readonly _notify = new Set<(notify: UiNotify) => void>();

  readonly subscribe = (listener: () => void) => {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  };

  readonly getSnapshot = (): AppState | undefined => this._state;

  /** Тости сервера з того самого каналу. */
  onNotify(listener: (notify: UiNotify) => void) {
    this._notify.add(listener);
    return () => this._notify.delete(listener);
  }

  /** Повідомлення каналу. `false` — пропуск `rev` (або патч до повного): канал має взяти повний стейт ще раз. */
  apply(message: LiveMessage): boolean {
    switch (message.type) {
      case 'state.full':
        this._rev = message.rev;
        this._set(message.state);
        return true;
      case 'state.patch':
        if (!this._state || message.rev !== this._rev + 1) return false;
        this._rev = message.rev;
        if (message.ops.length > 0) this._set(applyStatePatch(this._state, message.ops));
        return true;
      case 'notify':
        this._notify.forEach((listener) => listener(message.notify));
        return true;
    }
  }

  private _set(state: AppState) {
    this._state = state;
    this._listeners.forEach((listener) => listener());
  }
}

const StoreContext = createContext<AppStateStore | null>(null);
export const AppStateProvider = StoreContext.Provider;

const NO_STORE = { subscribe: () => () => undefined, getSnapshot: () => undefined };

/** Поточний AppState; без провайдера або до першого `state.full` — `undefined` (вузли малюються як є). */
export function useAppState(): AppState | undefined {
  const store = useContext(StoreContext) ?? NO_STORE;
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => undefined);
}

export function useAppStateStore(): AppStateStore | null {
  return useContext(StoreContext);
}
