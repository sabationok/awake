# SDUI у MaControl — project spec

Локальні особливості для глобального скіла `sdui` (`~/.claude/skills/sdui/SKILL.md`) і агента `sdui-developer`. Загальні
правила (шари, таблиця вузлів, патчі, лінь, кеш, `bind` / `show`, контекст дії, застаріле дерево, роути) — лише в
скілі; тут тільки MaControl. Де цей файл конкретніший, він важить більше.

## 1. Клієнти й канали

| клієнт | індекс / сторінки / стейт |
|---|---|
| Mac-аппка (`mac/`) | JSON lines через `~/Library/Application Support/MaControl/server.sock`; стейт: `state.full` при підключенні й на `state.get`, далі `state.patch`; тости `notify` |
| Web UI локально / Tailscale (`web/`, `BUILD_TARGET=local`) | API агента на тому ж origin; статичний експорт, який роздає express агента; стейт і тости — NDJSON `GET /api/ui/live` (повний `GET /api/ui/state`) |
| Web UI на Vercel (`web/`, `*.vercel.ts(x)`) | Upstash, лише читання; керування — тільки в локальному Web UI; стейт — ключ `state` (scope all) через `/api/ui/state` раз на 5 с |
| Telegram-бот | екрани з тих самих `@Bot` / роутів, по одному на callback |

## 2. Карта (2026-11-28)

| що | де |
|---|---|
| Контракт UI на дроті (`UiShell`, `UiPageLayout`, `UiNodeRow`, scope, actions) | `contracts/src/ui.ts`; ключі Upstash `uiKeys(uiNamespace(stage, гілка))` і повідомлення Mac — `contracts/src/index.ts`; relay — `contracts/src/relay.ts` |
| Збирання: індекс і сторінка за `id` + scope-фільтр | `agent/src/modules/modules.service.ts` (`buildShell`, `buildPage`, `buildAll`); модулі пишуть вкладені `UiPage` / `UiNode` у `MacModule.pages(ctx)`, на дріт вони йдуть лише через `normalizePage` (`agent/src/modules/helpers/normalize-page.ts`: id рядка `<сторінка>.<вузол>`, `rev` = sha1 рядків) |
| HTTP локально | `agent/src/modules/ui.controller.ts`: `GET /api/ui/shell`, `GET /api/ui/pages/:pageId` (ETag `"local:<rev>"`, `304`, `private, no-cache` — `helpers/send-cached.ts`), `POST /api/ui/events` |
| Роутер (дії, екрани бота) | `agent/src/bot/` (`@Bot`, `@BotAction`, `@BotScreen`, `BotRouterService`) |
| Канал Mac | `agent/src/modules/mac-ui.listener.ts` + `agent/src/mac-bridge/`: `shell` при підключенні й зміні; `layout.get {pageId, ifRev}` → `layout.page` / `layout.notModified` / `layout.notFound`; останні 4 відкриті сторінки отримують зміни |
| Канал Web UI | `agent/src/web-ui/` |
| Upstash: публікація + пульс | `agent/src/presence/services/ui-sync.service.ts`: `macontrol:ui:shell` + `macontrol:ui:page:<id>`, пишуться лише сторінки зі зміненим `rev`, зниклі видаляються |
| Relay (webhooxy) | `agent/src/relay/services/relay-host/`: viewer просить `shell` / `page`, host розсилає `revs` |
| Читання на Vercel | `web/src/app/api/ui/shell/route.ts`, `web/src/app/api/ui/pages/[pageId]/route.ts` (без `qr` і `copy`, ETag `"all:<ns>:<rev>"`), `web/src/demo/` |
| Web рантайм | дані `web/src/live/use-ui-layout.ts` (індекс + сторінка на екрані, `If-None-Match`); рядки → вузли сторінки `web/src/sdui/page-layout.ts`; рендер `web/src/sdui/node-view.tsx`; роутинг `web/src/shell/app-shell.tsx`; компоненти лише з `web/src/ui` |
| Mac рантайм | `mac/Sources/Contract/UiLayout.swift` (`UiShell`, `UiPageLayout.renderNodes(state:)`), `mac/Sources/Contract/AppState.swift` (патч, `show`, `bind` над JSON), `mac/Sources/Core/ServerConnection.swift` (`open(pageId)`, копія AppState, тости), `mac/Sources/Sdui/`; компоненти з Umbra |
| AppState (власник) | `agent/src/app-state/`: `AppStateService` (збирання, дифф, `rev`, `full(scope)` / `patchFor`), мапа «гілка → scope» `constants/state-branch-scopes.ts`, Mac — `listeners/mac-state.listener.ts`, web — `app-state.controller.ts`, тости — `UiNotifyService` + `listeners/session-notify.listener.ts`; Upstash — `ui-sync.service.ts` |
| Web стейт | `web/src/sdui/app-state-store.ts` (стор поза React, `useAppState`), `web/src/live/use-live-state.ts` (канал, перепідключення на пропуск `rev`), `layoutNodes(layout, state)` у `web/src/sdui/page-layout.ts` |

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
- **`rev` стейту — лічильник** (+1 на патч, пропуск → `state.full`), на відміну від `rev` індексу і сторінки.
  Після рестарту сервера знову з 1: клієнт бачить пропуск і бере повний.
- **`show { path, when | unless }`** замість лише `when[]`: «видно, поки сесія йде» = `unless: ['null']`, без
  окремого похідного boolean на кожну гілку-обʼєкт. **`bind { props }`** (`defineProps`) — значення стейту в пропи
  вузла як є (кінець і початок таймера); `UiTimer.untilCaption` — підпис «<текст> HH:MM» рахує рендерер з `until`.
- **Вузол з `show` / `bind { props }` без статичного значення**: таймер сесії не несе `until` у layout, інакше
  layout мінявся б на кожен старт / стоп. Усі клієнти MaControl уже рахують стейт; клієнт без стейту побачить обидва
  варіанти.
- **Нових значень у строгих enum Swift не додаємо**: `UiButton.variant` лишився `filled | plain | destructive`, бо
  Mac декодує його строго; нові дії йдуть через `UiMenuItem` (`default | accent | warn | danger`, невідомий → `default`).
- **`UiNotice.dismiss?: UiAction`** замість `closable` (є дія — є хрестик); `once` / `remind` не в контракті — сервер
  сам вирішує, чи слати вузол.
- **Дії розв'язує сервер** (owner, 2026-11-27, варіант A): сторінка шле вже відфільтрований за станом список
  `UiMenuItem`, без `when`; стан — з timestamp-колонок (`revokedAt`, `disabledAt`, `dismissedAt`). Пункт `scope: 'mac'`
  у web видно сірим з `hint`, сервер його відхиляє з не-Mac джерела. Будує пункти лише
  `agent/src/modules/helpers/menu-item.ts`.
- **Обмеження Mac-рендерера**: `sendUiEvent` не повертає результату (форма закривається одразу, помилку сервер
  показує станом сторінки); `UiNotice.sticky` у `Form` не працює — сповіщення в потоці.
- **Модель довіри Web ↔ Mac** (рішення): секрети на web не потрапляють; на кожну web-сесію Mac генерує HMAC-ключ `S`,
  обгорнутий ключем з пароля (Argon2id), `S` лише в пам'яті вкладки; кліки = тіло + `ts` + `nonce` + `HMAC(S)`, вікно
  ±N хв, повтори відкидаються; «Завершити» сесію = `revokedAt` на `S`. Без `S` web бачить лише статуси й маски, дії
  зміни сірі («розблокуйте сесію») і відхиляються сервером.

- **Простори ключів Upstash** (owner, 2026-11-28): одна база, ключі `macontrol:<простір>:ui:*`. Простір — stage
  (`dev`, `production`, TTL 90 днів) або гілка dev-збірки поза `dev` / `main` (`br:<гілка>`, тиждень). Vercel
  production читає `production`, dev — `dev`, preview — `br:<VERCEL_GIT_COMMIT_REF>`, без нього — `dev`.

## 5. Перехід

Рішення owner (2026-11-28): дерев більше немає, усе на індексі — вузли за `id` з `children` і `parentId`.

- [x] Стабільний серверний `id` вузла (`<сторінка>.<вузол>`), дріт `UiShell` + `UiPageLayout` з `rev`, усі канали
  з таблиці 1 (Mac `shell` + `layout.get`, `/api/ui/…` з ETag / 304, Upstash ключ на сторінку, Vercel, relay
  `shell` / `page` / `revs`). Клієнти збирають вузли лише сторінки на екрані.
- [x] Контракт `AppState`, `bind` / `show`, `defineBind` / `defineValueBind`, `applyStatePatch`, фікстури
  `contracts/fixtures/state/` (866c36a). Сервер `bind` і патчі стейту ще не шле.
- [x] Крок 1, перший зріз (2026-11-28): `AppStateService` (сесії, система, дозволи, налаштування модулів; одна
  мапа «гілка → scope»), `state.full` / `state.patch` по Mac socket і NDJSON `/api/ui/live`, ключ Upstash `state` +
  `/api/ui/state` на Vercel, `show` / `bind` у рантаймах web і Mac, тости сервера `notify` в обох. Сторінки Awake
  «Сесія» і Sleeper на `show` / `bind` (layout не залежить від `mac.active`: старт / стоп не міняють `rev`), рядок
  «Сон» (і на «Стан Mac»), перемикачі налаштувань модулів несуть `bind` на `modules.*`.
- [x] Вузли дій: `UiMenuItem`, `UiForm`, `item`, `notice`, `separator`, `UiSection.status / actions`, `UiTabs.sticky`;
  рендерери web (`web/src/sdui`) і Mac (`mac/Sources/Sdui`, `mac/Sources/Contract/UiActionTypes.swift`); сторінки
  Дозволи, Пристрої, Мережі, Пароль, Групи, Топіки, Tailscale, Поруч на `item` / `notice`.

Далі, по черзі (правила — у розділах скіла, тут лише що і де):

1. **Стейт і `bind`** — скіл «State, bind, show». Зроблено перший зріз (вище). Далі: «Дозволи» (sudoers і два
   «Надати…» на `permissions.*`), батарея / температура на «Сесії» і «Стані Mac» (зараз ще в layout, тож `rev`
   сторінки міняється з ними), системні слайдери (`system.volume` / `brightness`), select-налаштування; таймер
   «Старт — до HH:MM» без сесії ще рахує сервер від `now` (layout міняється раз на хвилину). Pending 10 с. Коли всі
   сторінки на `bind` — прибрати перезбирання раз на 5 с у `ui-sync.service.ts`; до того вузол з `bind` несе й
   статичне значення (крім погоджених винятків у розділі 4).
2. **Патчі layout і `layout.stale`** — скіл «Layout patches»: дифф у `ModulesService`, `layout.watch` з відкритих
   сторінок (Mac уже тримає останні 4), Upstash і далі пише лише змінені сторінки.
3. **Ліниві вузли** — скіл «Lazy loading and caching»: `lazy: true` на згорнутих секціях і довгих списках,
   `GET /api/ui/nodes/:id` і `layout.get { nodeId }` на Mac.
4. **Застаріле дерево** — скіл «Stale layout, unknown nodes, node refresh». Зараз web мовчки не малює невідомий
   вузол, Mac робить `.unknown` → `EmptyView`, сервер на стару дію відповідає `invalidCommand` / «Unknown action».
   Джерело свіжих вузлів: Vercel — Upstash-роути, локальний web — API агента, Mac — `server.sock`.
5. **UI-роути і статистика** — скіл «Routes on the server». Роутер бота (`agent/src/bot/`) уже є, клік з web і Mac
   іде в ті самі `@BotAction`. `@UiRoute`, `@RouteQuery`, `@UiFilter`, лейаут `stats`, `StatsInterceptor`; сторінки
   статистики Awake, Sleeper, Webhooxy, Telegram, Агент, Групи → `@StatsRoute` (`UiModuleStats` +
   `build-stats-charts.ts` лишаються декларацією; приклад — `GROUPS_UI_STATS` з `GroupsStatsQuery extends StatsQuery`
   і `@UiFilter` на `key`). Потім `@ListRoute` (історія сесій, журнал), `@SettingsRoute`; `pages(ctx)` живе поруч,
   поки всі сторінки не на роутах, і тоді індекс перестане збиратися з `pages()` усіх модулів. Назви дій модуля —
   типізований юніон.
6. **Контекст дії** — скіл «Actions: one context string per control»: `UiAction { module, name, params }` → один
   `ctx` на контрол з `pageId`, `nodeId`, `rev`; `STALE_LAYOUT` замість «Unknown action». Кодування — див. відкриті
   питання.

Ще не зроблено поза кроками:
- Модуль `notices` (`agent/src/notices/`, repository + service + DTO, міграція `notice_states`: `id` = id нотісу +
  версія, напр. `proximity.bluetooth@1`, `dismissedAt`, `remindAt`, `createdAt`); дія `{ module: 'notices', name:
  'dismiss', params: { id } }`; `remind.after` рахує сервер від `dismissedAt` / `createdAt`. Перше застосування після
  «Поруч» — сесія, що втрачає систему: `notice` `error`, `sticky: 'bottom'` (`modules/helpers/session-card.ts`).
- Прибрати `UiButton` / `UiButtons` і `UiControl { type: 'button' }`, коли жодна сторінка їх не шле (разом зі Swift).
- Remote KV Store замість блоків «Upstash» і «Ключі Upstash (на цьому Mac)» на «Мережі»: `section` зі статусом і
  формою `backend` (лише бекенди з адаптером на сервері) · `source` (`config | url`) · `url`; без Envify — таблиця
  `connections` (`slug pk, type, provider, v, securedFields, values json, disabledAt`), ключ шифрування не в тій
  самій БД, у відповідь лише маски. Без рішення по відкритих питаннях — тільки `config` і статус.
- `ModulesService.treeChanged$` → `layoutChanged$` (TODO(cleanup); ним користується незакомічений tailscale.listener
  іншої сесії). Старий ключ `macontrol:ui:tree` спливає за TTL.

**Чекає мокапу** (`CLAUDE.md` «Mockup before UI code»), сервер не чіпає:
- `Telegram > Групи > Список груп | Топіки | Статистика`; на `Telegram` — можливості конектора (read-only, з
  маніфесту) і події бота з «Сповіщень»; `Telegram > Команди` — меню «/» приватного чату, у групах команд немає, у
  топіка лише свої (бот тримає закріплене повідомлення).
- Web UI: вкладки `Пароль` і `Сесії` окремо від входу.
- «Поруч» — модуль верхнього рівня поряд з Awake / Sleeper.
- «Сповіщення» без табу «Попередження»: перемикачі на сторінках своїх модулів.
- Пристрої: sticky-фільтр `Local | Priv | Proxy` з під-табами провайдерів (`Priv` → Tailscale, `Proxy` → Webhooxy),
  секції «Сполучити новий», «Сполучені», «Запити» фільтруються каналом.

## 6. Перевірки

- `pnpm --filter @macontrol/agent typecheck`, `pnpm --filter @macontrol/web typecheck`
- Swift: `scripts/build-mac.sh`; нові файли helper-а — у `scripts/build-helper.sh`
- Паритет контракту: агент `macontrol-contract-keeper`
- Сервер без перевстановлення аппки: `pnpm agent:dev`; аппку ставити лише без сесії Awake / Sleeper і з
  розблокованим екраном
- Коміт на `dev` зі changeset, коли owner помітить зміну; без push
- Кожен `item` має не більше одного набору дій; дозвіл «видано» дає лише `danger`; mac-дії у web сірі з `hint`.

## 7. Відкриті питання

- **Фільтри статистики**: спільні (зараз період — налаштування сервера) чи свої в кожного клієнта як query роуту.
- **Меню бота**: Mini App (`web_app`, HTTPS і вхід через `initData`) чи reply keyboard з розділами.
- **`#pageId` чи чисті URL** зі SPA fallback в express агента і на Vercel.
- **Кодування контексту дії по каналах**: інлайн base64url для web і Mac, ticket для бота (`callback_data` ≤ 64 байти);
  чи потрібен HMAC на інлайн, коли контекст несе щось, що дає доступ.
- Де живе роут: у класі `@Bot` (один роутер на бот і UI) чи окремий `@UiController` поруч.
- Списки (пристрої «Поруч», історія сесій): рядки-вузли чи окремий вузол-список з пагінованим запитом; поріг
  «довгого списку» для `lazy` і `?cursor=`.
- Vercel: патчі layout і стейту через Upstash / proxy (журнал ops) чи лише перечитування за ETag.
- Підписка клієнта лише на гілки AppState, які читають відкриті сторінки.
- Таймаут `pending`: один на всіх (10 с) чи в `bind` вузла; операції над масивами в патчах стейту.
- Remote KV Store: Upstash REST (URL + токен) одним полем не вміщується — URL лише як connection string, REST-пара
  лише в конфігу?; ключ шифрування — Keychain чи файл у `~/.config/awake` (600).
- Канал `local`: авто-вхід чи пароль, як у `proxy`.
- Альтернатива «довіреній мережі», яку owner згадував, ще не описана.
