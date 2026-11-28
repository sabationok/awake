// Спільний стан MaControl (docs/specs/app-state-bind-spec.md). Сервер — єдиний власник: збирає AppState, шле його
// клієнтам повністю при підключенні й далі патчами з `rev`. Клієнти тримають копію і рахують стан кожного
// компонента з його `bind`, тож layout сторінок більше не несе значень і не перезбирається на кожну зміну.
import type { PowerSource, ThermalLevel } from './index';
import type { SettingValue } from './modules';
import type { MacPermission } from './ui';

/** Дозвіл macOS (TCC), який видає система помічнику. `requesting` — вікно macOS зараз відкрите. */
export type GrantState = 'granted' | 'denied' | 'notDetermined' | 'restricted' | 'requesting';

/** Правило sudoers із фіксованою командою: є або немає. */
export type SudoersState = 'granted' | 'missing';

export interface AppState {
  permissions: {
    /** Геолокація: без неї macOS не віддає назву Wi-Fi. */
    location: GrantState;
    bluetooth: GrantState;
    system: Record<MacPermission, SudoersState>;
  };
  sessions: {
    awake: { startedAt: string; until: string | null } | null;
    sleeper: { startedAt: string; sleepAt: string } | null;
  };
  system: {
    battery: number | null;
    power: PowerSource;
    thermal: ThermalLevel;
    lidClosed: boolean;
    ssid: string | null;
    volume: number | null;
    muted: boolean;
    brightness: number | null;
  };
  /** Налаштування модулів: `modules.<module>.<key>`. */
  modules: Record<string, Record<string, SettingValue>>;
}

// ── Шляхи ──────────────────────────────────────────────────────────────────────────────────────────────────────

type Prev = [never, 0, 1, 2, 3, 4];

/** Усі шляхи до листків і проміжних вузлів `T` через крапку: `permissions.bluetooth`, `modules.${string}.${string}`. */
export type StatePath<T = AppState, D extends number = 4> = [D] extends [never]
  ? never
  : {
      [K in keyof T & string]: NonNullable<T[K]> extends readonly unknown[]
        ? K
        : NonNullable<T[K]> extends object
          ? K | `${K}.${StatePath<NonNullable<T[K]>, Prev[D]>}`
          : K;
    }[keyof T & string];

/** Тип значення за шляхом. Проміжний `null` (немає сесії) дає `null` і на листку. */
export type StateAt<T, P extends string> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? StateAt<NonNullable<T[K]>, R> | (null extends T[K] ? null : never)
    : T extends Record<string, infer V>
      ? StateAt<V, R>
      : never
  : P extends keyof T
    ? T[P]
    : T extends Record<string, infer V>
      ? V
      : never;

/** Ключ мапи для значення: рядок як є, boolean → `'true' | 'false'`, null → `'null'`. Числа не мапляться. */
export type BindKey<V> = V extends string ? V : V extends boolean ? `${V}` : V extends null ? 'null' : never;

// ── Стани компонентів ──────────────────────────────────────────────────────────────────────────────────────────

/** Словники станів компонентів лібів (web `src/ui`, Mac `Umbra`). Як стан виглядає, вирішує компонент. */
export interface UiComponentStates {
  switch: 'on' | 'off' | 'pending' | 'disabled';
  status: 'ok' | 'warn' | 'error' | 'idle' | 'pending';
  nav: 'active' | 'inactive';
  /** Стану `hidden` немає: недоступне видно сірим. */
  button: 'ready' | 'pending' | 'disabled';
}
export type UiComponentKind = keyof UiComponentStates;

/** Прив'язка вузла до стейту: значення за `path` → стан компонента, невідоме → `fallback`. Лише дані. */
export interface UiBind<C extends UiComponentKind = UiComponentKind> {
  component: C;
  path: string;
  map: Partial<Record<string, UiComponentStates[C]>>;
  fallback: UiComponentStates[C];
}

/** Число чи рядок за шляхом без мапи (гучність, назва мережі): компонент бере значення як є. */
export interface UiValueBind {
  value: string;
}

/**
 * Прив'язка з перевіркою на сервері: шлях існує в AppState, мапа покриває КОЖНЕ значення за ним і містить лише
 * стани цього компонента. Нове значення в стейті → помилка компіляції в кожному вузлі, що на нього не реагує.
 */
export function defineBind<C extends UiComponentKind, P extends StatePath>(
  component: C,
  path: P,
  map: Record<BindKey<StateAt<AppState, P>>, UiComponentStates[C]>,
  fallback: UiComponentStates[C],
): UiBind<C> {
  return { component, path, map: map as UiBind<C>['map'], fallback };
}

export function defineValueBind<P extends StatePath>(path: P): UiValueBind {
  return { value: path };
}

// ── Дріт ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Патч: лише `set` за шляхом; масиви замінюються цілком. */
export interface StatePatchOp {
  path: string;
  value: unknown;
}

/** `rev` росте на 1. Клієнт, що побачив пропуск, просить `state.full`. */
export type StateMessage =
  | { type: 'state.full'; rev: number; state: AppState }
  | { type: 'state.patch'; rev: number; ops: StatePatchOp[] };

// ── Чисті функції для клієнтів і сервера ───────────────────────────────────────────────────────────────────────

/** Значення за шляхом; `undefined`, якщо шлях обривається. */
export function readStatePath(state: unknown, path: string): unknown {
  let node: unknown = state;
  for (const key of path.split('.')) {
    if (node === null || typeof node !== 'object' || !Object.hasOwn(node, key)) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

/** Стан компонента для поточного стейту. */
export function resolveBind<C extends UiComponentKind>(state: unknown, bind: UiBind<C>): UiComponentStates[C] {
  const value = readStatePath(state, bind.path);
  const key = value === null ? 'null' : typeof value === 'string' || typeof value === 'boolean' ? String(value) : undefined;
  if (key === undefined || !Object.hasOwn(bind.map, key)) return bind.fallback;
  return bind.map[key] ?? bind.fallback;
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/** Новий стейт з патчем (без мутацій). Відсутні проміжні вузли створюються; заборонені ключі — помилка. */
export function applyStatePatch<T>(state: T, ops: readonly StatePatchOp[]): T {
  let next = state as unknown;
  for (const op of ops) next = setPath(next, op.path.split('.'), op.value);
  return next as T;
}

function setPath(node: unknown, keys: string[], value: unknown): unknown {
  const [key, ...rest] = keys;
  if (key === undefined) return value;
  if (FORBIDDEN_KEYS.has(key)) throw new Error(`state patch: forbidden key "${key}"`);
  const base = node !== null && typeof node === 'object' && !Array.isArray(node) ? (node as Record<string, unknown>) : {};
  return { ...base, [key]: setPath(Object.hasOwn(base, key) ? base[key] : undefined, rest, value) };
}
