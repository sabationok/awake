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
| Контракт UI на дроті (`UiShell`, `UiPageLayout`, `UiNodeRow`, scope, actions) | `contracts/src/ui.ts`; ключі Upstash `UI_SHELL_KEY`, `uiPageKey(id)` і повідомлення Mac — `contracts/src/index.ts`; relay — `contracts/src/relay.ts` |
| Збирання: індекс і сторінка за `id` + scope-фільтр | `agent/src/modules/modules.service.ts` (`buildShell`, `buildPage`, `buildAll`); модулі пишуть вкладені `UiPage` / `UiNode` у `MacModule.pages(ctx)`, на дріт вони йдуть лише через `normalizePage` (`agent/src/modules/helpers/normalize-page.ts`: id рядка `<сторінка>.<вузол>`, `rev` = sha1 рядків) |
| HTTP локально | `agent/src/modules/ui.controller.ts`: `GET /api/ui/shell`, `GET /api/ui/pages/:pageId` (ETag `"local:<rev>"`, `304`, `private, no-cache` — `helpers/send-cached.ts`), `POST /api/ui/events` |
| Роутер (дії, екрани бота) | `agent/src/bot/` (`@Bot`, `@BotAction`, `@BotScreen`, `BotRouterService`) |
| Канал Mac | `agent/src/modules/mac-ui.listener.ts` + `agent/src/mac-bridge/`: `shell` при підключенні й зміні; `layout.get {pageId, ifRev}` → `layout.page` / `layout.notModified` / `layout.notFound`; останні 4 відкриті сторінки отримують зміни |
| Канал Web UI | `agent/src/web-ui/` |
| Upstash: публікація + пульс | `agent/src/presence/services/ui-sync.service.ts`: `macontrol:ui:shell` + `macontrol:ui:page:<id>`, пишуться лише сторінки зі зміненим `rev`, зниклі видаляються |
| Relay (webhooxy) | `agent/src/relay/services/relay-host/`: viewer просить `shell` / `page`, host розсилає `revs` |
| Читання на Vercel | `web/src/app/api/ui/shell/route.vercel.ts`, `web/src/app/api/ui/pages/[pageId]/route.vercel.ts` (без `qr` і `copy`, ETag `"all:<rev>"`), `web/src/demo/` |
| Web рантайм | дані `web/src/live/use-ui-layout.ts` (індекс + сторінка на екрані, `If-None-Match`); рядки → вузли сторінки `web/src/sdui/page-layout.ts`; рендер `web/src/sdui/node-view.tsx`; роутинг `web/src/shell/app-shell.tsx`; компоненти лише з `web/src/ui` |
| Mac рантайм | `mac/Sources/Contract/UiLayout.swift` (`UiShell`, `UiPageLayout.renderNodes()`), `mac/Sources/Core/ServerConnection.swift` (`open(pageId)`), `mac/Sources/Sdui/`; компоненти з Umbra |

## 3. Scope

`web` (Vercel теж) | `local` (Web UI агента, Mac) | `mac` (лише Mac-аппка: «Надати…», grant / revoke). Сервер
відмовляє в mac-діях з будь-якого іншого джерела. Vercel не отримує локальних гілок (адреси, ключі, `local`).

## 4. Погоджені відхилення

- **Хеш-роутинг** у web (`/app/#pageId`): одна статична сторінка в експорті, без редіректів (поки owner не вирішив
  інакше; чисті URL — відкрите питання).
- **Тема** належить кожному клієнту (owner, 2026-11-27): web `localStorage macontrol:theme`, Mac `UserDefaults theme`.
- **Vercel тільки читає**: дій звідти немає; пульс агента `macontrol:ui:alive` з налаштування «Пульс для Vercel».
- Назви від сервера: `shell.modules[].title`, `page.title` (`CLAUDE.md`).
- **Індекс і сторінки під `/api/ui/…`**, не `/ui/…`: решта API агента теж під `/api`.
- **`rev` індексу — рядок** (sha1 змісту), як і `rev` сторінки, не лічильник: не скидається з рестартом сервера.
- **`layout.notFound {pageId}`** на Mac-каналі: сторінки немає (модуль вимкнули), аппка не чекає вічно.

## 5. Перехід

Рішення owner (2026-11-28): дерев більше немає, усе на індексі — вузли за `id` з `children` і `parentId`. Тому
кроки 1–3 ui-layout-spec зроблено одним переходом, без перехідного дерева:

- [x] 1. Стабільний серверний `id` кожного вузла сторінки (`<сторінка>.<вузол>`, детерміновано на сторінці).
- [x] 2. Дріт: індекс роутів `UiShell` + по одній сторінці `UiPageLayout` (таблиця `UiNodeRow`) з `rev`.
- [x] 3. Канали: Mac (`shell` + `layout.get`), Web локально (`/api/ui/shell`, `/api/ui/pages/:id`, ETag / 304),
  Upstash (ключ на сторінку + індекс замість `macontrol:ui:tree`), Vercel (`/api/ui/shell`, `/api/ui/pages/[pageId]`),
  relay (`shell` / `page` / `revs`). Клієнти збирають вузли лише сторінки на екрані.
- [ ] 4–6. AppState / `bind`, патчі за `id`, застаріле (`stale`) — далі.

Лишилось: стан 5 с (`ui-sync`) як був; `ModulesService.treeChanged$` — TODO(cleanup) перейменувати на
`layoutChanged$` (ним користується незакомічений tailscale.listener іншої сесії); індекс збирається з `pages()` усіх
модулів — дешевше стане з роутами (`ui-routes-spec`). Старий ключ `macontrol:ui:tree` просто спливає за TTL.

## 6. Перевірки

- `pnpm --filter @awake/agent typecheck`, `pnpm --filter @awake/web typecheck`
- Swift: `scripts/build-mac.sh`; нові файли helper-а — у `scripts/build-helper.sh`
- Паритет контракту: агент `macontrol-contract-keeper`
- Сервер без перевстановлення аппки: `pnpm agent:dev`; аппку ставити лише без сесії Awake / Sleeper і з
  розблокованим екраном
- Коміт на `dev` зі changeset, коли owner помітить зміну; без push
