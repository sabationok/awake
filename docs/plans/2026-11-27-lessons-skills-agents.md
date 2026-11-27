# Уроки awake (MaControl) → скіли, агенти, правила

Аналіз 241 коміту (з 2026-11-19), specs, пам'яті сесій, global і project CLAUDE.md, коду. 2026-11-27.
Це план: нічого з нього ще не впроваджено. Зміни глобальних скілів робить їхній maintainer-агент, нові скіли й
агенти — окрема сесія на рівні `~/.claude` (cross-project, за global CLAUDE.md), коміт — claude-config-maintainer.

## A. Обов'язкові правила (у global CLAUDE.md або в наявний скіл)

| # | Правило | Звідки (доказ) | Куди |
|---|---|---|---|
| A1 | **Не прибирати й не додавати непрошене.** Вимкнене = видно сірим; кожне «прибрав / переніс» — у звіті | a42d19d (webhooxy сховали за env), 34875ce (непрошена сторінка «Сервер»); memory `no-unasked-removals` | global CLAUDE.md |
| A2 | **Переносити власника, а не латати там, де лежать дані.** Клієнт ніколи не шле стан і не тримає правило | 3739b84 → eebc6c6 (snapshot дозволів з аппки); memory `clients-never-own-data` | доповнити розділ «Responsibility split» прикладом |
| A3 | **Помічати марнотратні потоки даних** (повне дерево раз на 5 с, перезбирання на кожну подію) і пропонувати фікс до того, як будувати поверх | `ui-sync.service.ts:34`, `mac-ui.listener.ts`, web polling 2 с; 866c36a | global CLAUDE.md |
| A4 | **Фікс одного = фікс усіх однакових.** Однаковий тип сторінки — один builder; grep siblings, переводити всі за прохід | 9bd3107 (`buildStatsPage` замість 6 ручних); memory `one-layout-many-pages` | `frontend` skill + `nestjs` skill (через maintainers) |
| A5 | **Жодних побічних ефектів при запуску чи білді**: системні запити (TCC, пароль) — лише з кнопки | e76fe52, aa333fb, 7337d6e, 088dfa9; memory `grants-only-on-click` | `swiftui` skill (через новий macOS-скіл, B3) |
| A6 | **«Скомпілювалось» ≠ «працює».** Звіт каже, що саме перевірено (tsc / тест / встановлена аппка / скрін) | 8e205c4, a3cbd4a, звіт Mac-сесії сьогодні | global CLAUDE.md |
| A7 | **Brief субагента несе правила проєкту** (назви, заборони, scope) | memory `lead-orchestrator-role`; повтори помилок у делегованій роботі | `subagent-dispatch` skill |
| A8 | **Мокап перед UI-кодом** (повний варіант з project CLAUDE.md) | project CLAUDE.md; 25e384a / 5e5f358 / 048fb32 | global CLAUDE.md (зараз там одна фраза) |
| A9 | **Новий клієнт портує еталон файл-у-файл**, приймання — скріни side-by-side | ff755aa, `scripts/parity.sh`; memory `mac-umbra-ports-web-umbra` | `frontend` + `swiftui` skills |
| A10 | **Назви — як каже owner**; перед новою назвою в UI / системі — спитати | relay → proxy, Umbra, «пульт», `awake-*` → `mc-*` (219efea) | global CLAUDE.md, коротко |

## B. Нові скіли (найцінніше з проєкту)

| # | Скіл | Що всередині | Ключові файли-еталони |
|---|---|---|---|
| B1 | **`sdui`** — server-driven UI | Контракт дерева (page → node union), scopes, `UiAction` / `UiEvent` назад, меню вже розв'язані сервером, форма: 1 поле inline / 2+ модалка, лейбли лише з дерева, екрани лише з ліби, **layout + AppState + typed `bind` + патчі з `rev`**, pending після кліку, Swift-дзеркало + decode-тест | `contracts/src/ui.ts`, `contracts/src/state.ts`, `web/src/sdui/node-view.tsx`, `mac/Sources/Sdui/*`, `docs/specs/*` |
| B2 | **`module-manifest`** (NestJS) | Фіча декларує себе даними: pages, settings (`<module>.<key>`), permissions, notifications, stats, hooks; host реєструє, валідує на старті, малює загальні «Налаштування» без спецвипадків | `agent/src/modules/types/mac-module.ts`, `helpers/validate-module-manifest.ts`, `contracts/src/modules.ts` |
| B3 | **`macos-platform`** | TCC і responsible process (re-spawn), helper-бандл з LSUIElement у `Contents/Library/Helpers`, bundle ids dev / app, ad-hoc підпис (дозволи злітають кожен білд) vs сертифікат, sudoers-правила з фіксованими командами (`sudo -n -l` false positive, 1c40bb8), запити лише з кнопки, Spotlight і старі бандли | `Helper/System/Responsibility.swift`, `Helper/System/PrivacyAccess.swift`, `scripts/build-helper.sh`, `scripts/build-mac.sh` |
| B4 | **`desktop-shell-server`** | Тонка нативна оболонка + Node-сервер у бандлі + привілейований helper-subprocess (JSON lines, id + timeout, рестарт) + unix socket з replay останнього повідомлення; hot-swap сервера в dev (`agent-dev/` + `server.json`), standalone-режим | `contracts/src/helper.ts`, `agent/src/mac-helper/mac-helper.service.ts`, `mac-app-channel.service.ts`, `mac/Sources/Core/ServerLauncher.swift`, `scripts/agent-dev.sh` |
| B5 | **`owner-changelog`** | Changesets для власника (його мовою, «що змінилось», файл руками — `changeset add` висне без TTY), build passport, анонс нових записів у Telegram | `scripts/build-info.mjs`, `agent/src/app-update/*`, project CLAUDE.md |

## C. Агенти

| # | Агент | Звідки | Що зробити |
|---|---|---|---|
| C1 | **`contract-parity-keeper`** (global) | `awake-contract-keeper` | Узагальнити: один TS-контракт, кілька споживачів, рукописні Swift / Kotlin дзеркала; правила version skew (нові поля optional, невідомий вузол деградує). Мапа споживачів — параметр brief. awake лишає короткий overlay |
| C2 | **`sdui-developer`** (global) | новий, на B1 | Додає вузол / сторінку / bind наскрізь: контракт → сервер → web renderer → Swift renderer → decode-тест |
| C3 | **`nestjs-pattern-guard`** (global) | `awake-pattern-guard` (~90% копія `nestjs` skill) | Глобальний reviewer, що вантажить `nestjs` skill; локально лишається `check:sql` і timestamp-колонки |
| C4 | **`swift-reviewer`** (global) | `awake-swift-reviewer` | Загальні правила зі `swiftui` + «нічого не зникає непрошено»; SDUI-рендерер і permission-гейт — overlay |
| C5 | **`swift-umbra-lib-maintainer`** | вимагає правило lib naming | Власник `~/projects/swift-umbra-lib` (README / CHANGELOG / CONSUMERS / spec, гілка `dev`) |
| C6 | `module-manifest-developer` | лишається project-агентом | Ядро → у скіл B2; сам агент вирівняти з кодом (див. D2) |

## D. Виправити першим (борг, який заважає всьому вище)

1. Project-агенти посилаються на мертві шляхи старої аппки: `Sources/Features/Remote/UiTree.swift`, `AwakeModel`, `PermissionGate`, `scripts/build.sh`, `web/src/features/sdui` (`awake-contract-keeper`, `awake-swift-reviewer`).
2. `module-manifest-developer` описує API, якого в коді немає (`@UiModule`, `@BuildUiPage`, `@OnUiSetting`, `*.ui-provider.ts`); код — `MacModule` + `pages(ctx)`.
3. `swiftui` skill має приклади зі старого layout awake (`Features/`, `AwakeModel+Telegram`) — оновити через нову структуру `mac/Sources/{App,Contract,Core,Sdui,Shell,Ui}`.
4. Swift-дзеркало `mac/Sources/Contract/UiTree.swift` ніхто не перевіряє: decode-тест на фікстурах (як `contracts/fixtures/state`).
5. `contracts/src/*.js` — скомпільоване сміття поруч із `.ts` (не наше, не закомічене; прибрати з власником).
6. `app-update`: позначка «бачив» зберігається до `notify`, тож невдала відправка губить записи.
7. Права за джерелом перевіряються руками в кожному handler (`if (source === 'mac')`): `@AllowSources('mac')` guard; Touch ID — `@RequireOwner('reason')`.

## E. Опціональне, корисне

- **Transport-neutral action bus** (`@Bot` / `@BotAction` через DiscoveryService, один `dispatch` для SDUI, Telegram, Mac, журнал) — кандидат у `@my-nestjs-kit` (nest-kit-maintainer). `agent/src/bot/services/bot-router.service.ts`.
- **Step-up owner confirm** (Touch ID ↔ WebAuthn / 2FA) як патерн у `nestjs` skill.
- **Declared stats → stats page builder** — у `nestjs-stats` skill (`build-stats-page.ts`, live ticks).
- **Security checklist** у `nestjs` skill: токен прив'язаний до каналу сполучення (7cce0b1), guard fail-closed для non-HTTP (e1981bb), `safeNextPath` по нормалізованому виходу (309d0b8), кривий payload не валить процес (7728d55), pairing code не на диск (5cae837).
- **Read-only public mirror + прямий довірений канал** (Vercel ← Upstash; LAN / tailnet) — нотатка в `frontend-nextjs` (source chain з банером уже там).
- Уже глобально, нічого не треба: stage map, vendored shim з `vendor.json`, lib naming, variant display name, dev-only гілки.

## Порядок

1. D1–D3 (агенти й скіл показують на неіснуюче — шкодять уже зараз).
2. A1–A10 одним проходом у global CLAUDE.md і скіли (через maintainers).
3. B1 `sdui` + C2 (найбільша цінність, і там же закінчити AppState / bind).
4. B3 + B4 (macOS / desktop), C1, C3–C5.
5. B2, B5, E — за потребою.
