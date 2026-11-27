# AppState + bind: layout окремо від стейту — spec v0.1

Статус: чернетка, погоджено ідею (owner, 2026-11-27). Код ще не почато.

## Проблема

Сервер на кожну зміну і ще раз на 5 с (`agent/src/presence/services/ui-sync.service.ts:34`) перезбирає весь
`UiTree` і шле його всім клієнтам (Mac: `mac-bridge.service.ts` `sendTree`, web, Vercel). Значення вшиті в
розмітку (`UiSwitch.value`, `UiStatus`…), тож один світч = усе дерево по дроту, і клієнт після кліку чекає
перезбирання.

## Рішення: три шари

1. **Layout** — структура, лейбли, дії, `bind`. Без значень. Шлеться рідко: старт, зміна набору модулів,
   увімкнення / вимкнення модуля, зміна порядку. Має `layoutRev`.
2. **AppState** — один типізований об'єкт усього стану, спільний для сервера, web і Mac. Шлеться повністю при
   підключенні, далі патчами з `rev`.
3. **Стани компонентів** — словник станів кожного компонента живе в лібі (web `src/ui`, Mac `Umbra`). Як стан
   виглядає, вирішує компонент; сервер лише каже, яке значення стейту → який стан.

## Власники (без змін у split)

- Сервер — власник `AppState` і layout. Тільки він змінює стейт.
- Клієнти тримають копію стейту, застосовують патчі, рахують стан компонента з `bind`. Єдиний власний стан
  клієнта — `pending` від кліку до патча (optimistic), не довше таймауту.
- Тема лишається узгодженим винятком (клієнтська).

## Контракт (`contracts/src/state.ts`)

```ts
export interface AppState {
  permissions: { bluetooth: GrantState; location: GrantState; sudoers: Record<MacPermission, GrantState> };
  sessions: { awake: SessionState | null; sleeper: SessionState | null };
  system: { volume: number; muted: boolean; brightness: number; battery: BatteryState; /* … */ };
  modules: Record<string, ModuleState>;   // per-module гілки, тип задає модуль
}
export type GrantState = 'granted' | 'denied' | 'notDetermined' | 'restricted';

export type StateMessage =
  | { type: 'state.full'; rev: number; state: AppState }
  | { type: 'state.patch'; rev: number; ops: { path: Path<AppState>; value: unknown }[] };
```

- `rev` росте на 1. Клієнт, що побачив пропуск (`rev !== last + 1`), просить `state.full`.
- Патч — лише `set` за шляхом (без add/remove масивів у v0.1; масиви замінюються цілком).
- Scope: сервер фільтрує гілки стейту так само, як сторінки. Дерево для Vercel не отримує локальних гілок
  (адреси, ключі, `local`). Фільтр — одна функція на сервері, одна мапа «гілка → scope».

## bind у вузлі

`UiNodeBase` отримує необов'язкове поле:

```ts
interface UiBind<S extends string> {
  path: string;                 // шлях у AppState
  map: Record<string, S>;       // значення → стан компонента
  fallback: S;                  // невідоме / відсутнє значення
}
```

Типізація на сервері (компілятор перевіряє шлях і повноту мапи):

```ts
type Path<T> = { [K in keyof T & string]: T[K] extends object ? `${K}.${Path<T[K]>}` : K }[keyof T & string];
type At<T, P> = P extends `${infer K}.${infer R}` ? At<T[K & keyof T], R> : T[P & keyof T];

function bindSwitch<P extends Path<AppState>>(
  path: P, map: Record<At<AppState, P> & string, SwitchState>, fallback: SwitchState = 'disabled',
) { return { path, map, fallback }; }
```

- `map` — лише дані. Жодних виразів. Похідна логіка («увімкнено і є дозвіл») = окреме поле в стейті, яке
  рахує сервер.
- Boolean-шляхи мапляться ключами `'true' | 'false'`. Числові (гучність) не мапляться: компонент бере значення
  як є (`bind.value: path`).

## Словники станів (у лібі)

| компонент | стани |
|---|---|
| switch | `on` `off` `pending` `disabled` |
| status / item badge | `ok` `warn` `error` `idle` `pending` |
| nav / tab | `active` `inactive` |
| button | `ready` `pending` `disabled` (стану `hidden` немає: недоступне видно сірим) |

Нові стани додаються в лібу першими, потім у юніон у `contracts`.

## Клік і pending

1. Клік → клієнт ставить вузлу `pending` локально і шле дію як зараз (`UiEvent`).
2. Сервер виконує, змінює стейт, шле патч → клієнт знімає `pending`, стан з `bind`.
3. Помилка або таймаут (10 с) → `pending` знімається, стан з поточного стейту, помилка — як зараз.

## Клієнт: стор ≠ стейт (web)

**Стор** — усе, що тримає клієнт. **`AppState`** — лише одна його гілка: серверна копія того, що стосується UI
(дозволи, що активне, сесії, системні значення). Owner, 2026-11-27.

```ts
interface ClientStore {
  appState: AppState | null;   // копія з сервера; змінює лише `state.full` / `state.patch`
  rev: number;
  layout: UiTree | null;       // розмітка з `bind`
  connection: 'connecting' | 'online' | 'offline';
  pending: Record<string, true>; // node id → чекає патча після кліку (лише клієнт)
  // клієнтські речі: тема (`macontrol:theme`) тощо
}
```

- Стор живе поза React (`subscribe` / `getSnapshot`), не в Context value.
- Поки що компоненти підписуються на **весь стор** (`useSyncExternalStore(store.subscribe, store.get)`); точкові
  селектори — пізніше, коли буде видно потребу. `applyStatePatch` уже зберігає посилання незмінених гілок.
- **`<Bound bind={…}>`** — обгортка в `web/src/sdui`, як `Controller` у React Hook Form: читає стор, рахує стан
  через `resolveBind`, накладає `pending` і передає компоненту ліби звичайний проп `state`. Компоненти `src/ui`
  нічого не знають про стор, шляхи й сервер.
- Mac — той самий поділ: `@Observable` стор з гілкою `appState`, `Bound` у `mac/Sources/Sdui`.

## Mac (Swift)

- `AppState` декодується вручну за `contracts/src/state.ts`; патч застосовується за шляхом до `[String: JSON]`
  копії плюс типізовані геттери. Невідомий шлях / значення → `fallback`.
- Відповідність перевіряє macontrol-contract-keeper і тест-фікстури (`contracts/fixtures/state/*.json`), які
  декодують і TS, і Swift.

## Перехід

1. `contracts/src/state.ts` + `bind` у `UiNodeBase` (необов'язковий) + фікстури.
2. Сервер: `AppStateService` (збирає, тримає `rev`, шле повний / патчі по каналах Mac socket, web, Vercel зі
   scope-фільтром).
3. Перша сторінка — «Дозволи»: sudoers-рядки і два рядки «Надати…» (Wi-Fi / геолокація, Bluetooth) через `bind`
   на `permissions.*`.
4. Далі світчі налаштувань модулів, статуси сесій, системні слайдери.
5. Коли всі сторінки на `bind` — прибрати перезбирання дерева раз на 5 с; layout шлеться лише при зміні.

Поки вузол без `bind` — клієнт рендерить значення з вузла, як зараз. Обидва шляхи живуть разом до кроку 5.

## Відкриті питання

- Чи шле Vercel-канал патчі так само (через proxy), чи там лишається повне дерево з меншою частотою.
- Таймаут `pending`: один на всіх (10 с) чи в `bind` вузла.
- Чи потрібні в патчах операції над масивами (списки пристроїв, історія) — у v0.1 масив замінюється цілком.
