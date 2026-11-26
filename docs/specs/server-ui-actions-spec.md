# Spec: сервер віддає дії, картки і сповіщення (MaControl)

Статус: чернетка. Похідний від `docs/specs/ui-actions-and-forms-spec.md` (далі «UI-спек»): тут лише те, що
має зробити сервер (`agent/`), щоб Web UI показав сторінки за UI-спеком. Клієнтська частина вже є (див. 1).

## 1. Що вже зроблено (контракт і Web UI)

`contracts/src/ui.ts`, нове, усе додаткове (старі вузли не змінені):

- `UiActionVariant` = `default | accent | warn | danger`; `UiConfirm { title, text, ok }`.
- `UiMenuItem { id, label, icon?, variant, action, confirm?, form?, scope?, hint?, disabled? }`.
- `UiForm { title?, fields: UiFormField[], submit? }`, `UiFormField { name, label, kind: text|password|url|select, value?, placeholder?, hint?, required?, minLength?, options? }`.
  Значення полів приходять в `action.params[name]`. 1 поле → інлайн-форма, 2+ → модалка (вирішує рендерер).
- `UiItem` (`type: 'item'`): `title, icon?, status?: UiStatusBadge, tags?: UiTag[], copy?: { value, label? }, comment?, control?, actions?: UiMenuItem[]`.
- `UiNotice` (`type: 'notice'`): `variant: info|warn|error, icon?, title?, text, sticky?: top|bottom, dismiss?: UiAction`.
- `UiSeparator` (`type: 'separator'`): `word?`.
- `UiSection.status?`, `UiSection.actions?` — стан і дії в шапці блоку.
- `UiTabs.sticky?` — плашка вкладок прилипає до верху. Більше 5 вкладок рендерер сам малює дропдауном (правило 4.5a).

Web: рендерери цих вузлів у `web/src/features/sdui/nodes/` (`item-node`, `notice-node`, `separator-node`,
`action-set`), прев'ю всіх варіантів — `/dev/sdui` у локальному dev-білді (`pnpm --filter @awake/web dev:local`).

Відхилення від UI-спека, свідомі:
- `UiNotice.closable` замінено на `dismiss?: UiAction`: є дія — є хрестик; сервер знає, яку дію чекати.
- `once` і `remind` не в контракті: це рішення сервера, чи слати вузол узагалі (див. 4). Клієнт їх не бачить.
- `UiButton.variant` не змінено: Swift декодує його строгим enum, нове значення зламало б дерево. Нові дії йдуть лише
  через `UiMenuItem`; `UiButton` прибираємо, коли сторінки перейдуть (див. 6).

## 2. Передумова: Swift-рендерер (не сервер, але блокує сервер)

Mac-аппка зараз декодує невідомий вузол як `.unknown` і нічого не малює (`Sources/Features/Remote/UiTree.swift`).
Поки там немає `item` / `notice` / `separator` і `UiSection.actions`, сервер **не може** переводити сторінки, де
є дії, що працюють лише на Mac (Дозволи: «Надати / Відкликати» зі `scope: 'mac'`). Інакше ці дії зникнуть з Mac.

Порядок: Swift-рендерер (UI-спек 4.2a, Swift-частина) → сервер переводить сторінки. Сторінки без mac-дій можна
переводити раніше, якщо їх у Mac-аппці не показують або тимчасова відсутність прийнятна (питання до власника).

## 3. Хелпер дій (новий, у сервері)

Одне місце, що будує `UiMenuItem`, щоб сторінки не писали об'єкти руками:

```ts
// agent/src/common/ui/menu-item.ts
export function menuItem(id: string, label: string, action: UiAction, opts?: Partial<Omit<UiMenuItem, 'id' | 'label' | 'action'>>): UiMenuItem
```

- `variant` за замовчуванням `default`.
- Список дій сторінка будує вже розв'язаним за станом (UI-спек 3, варіант A). Ніякого `when`.
- Стан береться з timestamp-колонок (`revokedAt`, `disabledAt`, `dismissedAt`), bool — тільки у відповіді.
- Дії зі `scope: 'mac'` сервер і далі відхиляє з будь-якого іншого джерела (як зараз у `mac-permissions`):
  вимкнений пункт у web — лише UX.
- Дія з формою: обробник читає `params[name]` і валідовує сам (довжина пароля тощо); помилка повертається як
  зараз, рендерер покаже її у формі.

## 4. Сповіщення в сторінці (`UiNotice`)

Нове серверне: стан закриття і нагадувань.

- Таблиця `notice_states` (міграція, ORM-шим `src/nest-kit/sqlite`): `id text pk` (id нотісу + версія, напр.
  `proximity.bluetooth@1`), `dismissedAt timestamp | null`, `remindAt timestamp | null`, `createdAt`.
- Дія `{ module: 'notices', name: 'dismiss', params: { id } }` пише `dismissedAt`. Модуль `notices` у
  `agent/src/notices/` (repository + service, DTO-класи, без сирого SQL).
- Сервер не шле вузол, якщо `dismissedAt` є і `once`; шле знову, коли настав `remindAt` (`remind.after` від
  `dismissedAt` або `createdAt`). Ці правила живуть у сервісі, не в контракті.
- Після `dismiss` сервер шле оновлене дерево (SSE / socket, як усі зміни стану).

Перші застосування:
- «Поруч»: підказка Bluetooth → `notice` `warn`, без `dismiss` (зараз сірий текст у `proximity/pages/proximity-page.ts`).
- Сесія, що втрачає систему (Awake / Sleeper): `notice` `error`, `sticky: 'bottom'` (`modules/helpers/session-card.ts`).

## 5. Сторінки: що сервер міняє

Кожен пункт — заміна `row` + `buttons` на `item` з `actions`. Логіка модулів не змінюється.

| Сторінка | Файл | Що |
|---|---|---|
| Дозволи | `mac-permissions/pages/permissions-page.ts` | Рядок системи → `item`: `status` «Видано» green / «Немає» gray, `comment` = призначення. Дія: видано → `danger «Відкликати»` з `confirm`; ні → `accent «Запит»`. Обидві `scope: 'mac'`, `hint: 'Змінити можна лише в аппці на Mac'`. `disabled`, коли Awake тримає `sleepControl`. Окремий вузол `buttons` прибрати. **Після Swift (2).** |
| Пристрої | `web-ui/pages/devices-page.ts` | Сполучений пристрій → `item`: title «Chrome · iPhone», `status` «Сполучено», `tags` = канал (`Tailscale`), `comment` «Сполучено … · заходив …». Дія `danger «Відкликати»` з `confirm`. Кнопки під рядком прибрати. |
| Мережі | `web-ui/pages/networks-page.ts` | Довірена мережа → `item` з однією дією `danger «Прибрати «<назва>»»` з `confirm`, `scope: 'mac'`. Remote KV Store — див. 7. |
| Пароль Web UI | `web-ui/pages/login-page.ts` | `item` «Пароль», `status` «Задано» / «Не задано», дія `default «Змінити»` з `form: { fields: [{ name: 'password', kind: 'password', minLength: 12, required: true }] }` → інлайн-форма. Велику кнопку «Зберегти» прибрати. Окрема вкладка — **після мокапу** (8). |
| Вебсесії | `web-ui/pages/login-page.ts` (поки) | `item` на сесію, дія `danger «Завершити»` з `confirm`. Сервер відкликає ключ сесії (`revokedAt`). Порожній стан — `text` «Зараз ніхто не увійшов». |
| Список груп | `groups/pages/groups-list-page.ts` | `tabs` `Активні · N | Неактивні · N | Запити · N` (лічильник у label), `sticky: true`. Група → `item`: `status` «Активна» / «Вимкнена», `comment` «Додав <id>». Дії з маніфесту Telegram: `default «Деактивувати» / «Активувати»` + `danger «Вийти з групи»` з `confirm` (2 пункти → меню). |
| Топіки | `groups/pages/groups-topics-page.ts` | Один `section` на всі топіки, `actions: [accent «Створити»]` з `form` (назва, 1 поле). Топік → `item`: `comment` «Sleeper · активний · шле скрипт Mac», `control` switch «публікувати», `actions`: `default «Команди»`, `danger «Видалити»` з `confirm` («видаляється в групі Telegram, незворотно»). `create «Створити заново»` — лише коли топіка немає в Telegram. Вибір групи — `tabs` (рендерер сам перейде на дропдаун від 6 груп). Заголовок-секція на кожен топік прибрати. |
| Tailscale | `tailscale/pages/tailscale-page.ts` | Рядок модуля: перемикач + `status` «Працює» / «Вимкнено». Адреса → `item` з `copy: { value: url }`. Прибрати рядок «Web UI через Tailscale працює» (не стан модуля). Футер — лише про модуль. |
| Поруч | `proximity/pages/proximity-page.ts` | Підказка Bluetooth → `notice` (4). Окремий модуль у сайдбарі — **після мокапу** (8). |

Порожній набір дій → поле `actions` не шлемо (рендерер нічого не малює).

## 6. Прибрати після переходу

- `UiButton` / `UiButtons` і `UiControl` `{ type: 'button' }`, коли жодна сторінка їх не шле; разом зі Swift.
- `web/src/components/key-value-row.tsx` лишається для `row` (не розширюємо, UI-спек 8).

## 7. Remote KV Store (замість «Upstash» і «Ключі Upstash»)

Сервер:
- Бекенди, які показувати, = модулі зі стор-адаптером (зараз Upstash; Redis — коли з'явиться адаптер). Список
  будує сервер; клієнт не знає про бекенди.
- `section` «Remote KV Store», `status` «Підключено» / «Не підключено», `actions: [default «Налаштувати»]` з
  `form`: `backend` (select), `source` (select `config | url`), `url` (url). Обробник: `config` — підключення з
  env / Envify; `url` — модуль-власник бекенда створює підключення з connection string.
- Зберігання, коли Envify недоступний: таблиця `connections` з UI-спека 6.3 (`slug pk, type, provider, v,
  securedFields, values json, disabledAt`). Ключ шифрування — не в тій самій БД (Keychain або `~/.config/awake`, 600).
- У відповідь клієнту `values` лише замасковані («•••• задано»); значення назад не йде.

Відкрите (з UI-спека 6): URL для Upstash REST (одне поле не вміщує URL + токен) і джерело ключа шифрування.
Без рішення робимо тільки `config`-варіант і статус.

## 8. Переставляння сторінок — тільки після мокапу

За CLAUDE.md («Mockup before UI code») ці пункти чекають мокапу в чаті й згоди власника, сервер їх поки не чіпає:

- `Telegram > Групи > Список груп | Топіки | Статистика` (UI-спек 5.1, 5.10).
- Вкладки Web UI: `Пароль` і `Сесії` окремо від входу (5.5, 5.6).
- «Поруч» як модуль верхнього рівня (5.8).
- «Сповіщення»: без табу «Попередження», перемикачі на сторінках своїх модулів; події бота на вузол `Telegram` (5.11).
- Пристрої: фільтр каналів `Local | Priv | Proxy` з під-табами провайдерів (5.3-А).
- Можливості конектора Telegram (read-only) окремо від налаштувань груп (5.10).

## 9. Перевірка

- Кожен `item` має не більше одного набору дій; дозвіл «видано» дає лише `danger`.
- mac-дії приходять у web вимкненими з `hint` і відхиляються сервером з не-Mac джерела.
- `awake-contract-keeper` після кожного кроку: агент / web / Swift узгоджені.
- `awake-pattern-guard` на нові repository / entity / migration (`notices`, `connections`).
- Changeset `"macontrol": minor` на кожен крок, що власник помітить.
