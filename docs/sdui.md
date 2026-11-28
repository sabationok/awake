# SDUI у MaControl — project spec

Локальні особливості для глобального скіла `sdui` (`~/.claude/skills/sdui`) і агента `sdui-developer`. Де цей файл
конкретніший, він важить більше. Дизайн по шарах — у специ нижче.

| шар | spec |
|---|---|
| Індекс роутів і рядки сторінок, патчі за `id`, лінь, кеш, застаріле дерево | `docs/specs/ui-layout-spec.md` |
| AppState, `bind`, `show`, pending, стор клієнта | `docs/specs/app-state-bind-spec.md` |
| Роути на сервері, query DTO, `@StatsRoute` + `StatsInterceptor`, Telegram | `docs/specs/ui-routes-spec.md` |
| Кліки й форми | `docs/specs/server-ui-actions-spec.md`, `docs/specs/ui-actions-and-forms-spec.md` |

## 1. Клієнти й канали

| клієнт | індекс / сторінки / стейт |
|---|---|
| Mac-аппка (`mac/`) | JSON lines через `~/Library/Application Support/MaControl/server.sock` |
| Web UI локально / Tailscale (`web/`, `BUILD_TARGET=local`) | API агента на тому ж origin; статичний експорт, який роздає express агента |
| Web UI на Vercel (`web/`, `*.vercel.ts(x)`) | Upstash, лише читання; керування — тільки в локальному Web UI |
| Telegram-бот | екрани з тих самих `@Bot` / роутів, по одному на callback |

## 2. Карта (2026-11-28)

| що | де |
|---|---|
| Контракт UI (`UiTree`, `UiPage`, `UiNode`, scope, actions) | `contracts/src/ui.ts`; ключі Upstash `contracts/src/index.ts` |
| Збирання сторінок і scope-фільтр | `agent/src/modules/modules.service.ts` (`buildTree`), сторінки — `MacModule.pages(ctx)` |
| Роутер (дії, екрани бота) | `agent/src/bot/` (`@Bot`, `@BotAction`, `@BotScreen`, `BotRouterService`) |
| Канал Mac | `agent/src/mac-bridge/` (`sendTree`) |
| Канал Web UI | `agent/src/web-ui/` |
| Upstash: публікація + пульс | `agent/src/presence/services/ui-sync.service.ts` |
| Читання на Vercel | `web/src/app/api/tree/route.vercel.ts`, `web/src/demo/` |
| Web рантайм | `web/src/sdui/` (`node-view.tsx`), роутинг `web/src/shell/app-shell.tsx`; компоненти лише з `web/src/ui` |
| Mac рантайм | `mac/Sources/Contract/UiTree.swift`, `mac/Sources/Sdui/`; компоненти з Umbra |

## 3. Scope

`web` (Vercel теж) | `local` (Web UI агента, Mac) | `mac` (лише Mac-аппка: «Надати…», grant / revoke). Сервер
відмовляє в mac-діях з будь-якого іншого джерела. Vercel не отримує локальних гілок (адреси, ключі, `local`).

## 4. Погоджені відхилення

- **Хеш-роутинг** у web (`/app/#pageId`): одна статична сторінка в експорті, без редіректів (поки owner не вирішив
  інакше; чисті URL — відкрите питання).
- **Тема** належить кожному клієнту (owner, 2026-11-27): web `localStorage macontrol:theme`, Mac `UserDefaults theme`.
- **Vercel тільки читає**: дій звідти немає; пульс агента `macontrol:ui:alive` з налаштування «Пульс для Vercel».
- Назви з дерева сервера: `tree.modules[].title`, `page.title` (`CLAUDE.md`).

## 5. Перехід

Ще не почато: дріт несе повне дерево (`UiTree`), Upstash — один ключ `macontrol:ui:tree`, публікація лише на зміну.
Кроки — у «Перехід» кожного спеку; першим — стабільні `id` і індекс роутів.

## 6. Перевірки

- `pnpm --filter @awake/agent typecheck`, `pnpm --filter @awake/web typecheck`
- Swift: `scripts/build-mac.sh`; нові файли helper-а — у `scripts/build-helper.sh`
- Паритет контракту: агент `macontrol-contract-keeper`
- Сервер без перевстановлення аппки: `pnpm agent:dev`; аппку ставити лише без сесії Awake / Sleeper і з
  розблокованим екраном
- Коміт на `dev` зі changeset, коли owner помітить зміну; без push
