# UI-роути: сторінки з роутера бота — spec v0.1

Статус: чернетка з розмови з owner, 2026-11-28. Код ще не почато. Пов'язано: `app-state-bind-spec.md`.

## Проблема

Бот уже має роутер як nestjs-telegraf: `@Bot(MACONTROL_BOT, { namespace, command })`, `@BotAction`, `@BotScreen`,
`BotRouterService` знаходить їх на старті, команди Telegram (`setMyCommands`) будуються з нього. Клік у Web UI і
Mac-аппці йде в ті самі `@BotAction`.

Сторінки UI з роутера не будуються: кожен модуль руками збирає вузли в `MacModule.pages(ctx)`, кнопка знаходить
обробник лише за рядком `name` (помилка видна тільки на кліку). Статистика вже напівдекларативна (`UiModuleStats` +
`buildStatsCharts`), але це окрема декларація, не роут, а фільтри живуть як налаштування сервера.

## Рішення

1. **Роут** каже, що існує: шлях, назва, тип лейауту. З роутів будуються меню (сайдбар, крихти, команди бота).
2. **DTO запиту** у кожного роуту свій: валідує параметри з будь-якого транспорту (web, Mac, Telegram callback) і
   через `@UiFilter` описує, які фільтри намалювати. Різна фільтрація = різні DTO від спільної бази.
3. **Дані** дає обробник або, для типових роутів, інтерцептор. Розмітки обробник не будує.
4. **Лейаут** — один спільний компоновник на тип сторінки (`stats`, `list`, `form`, …): метадані роуту + метадані
   DTO + результат → вузли. Свої секції поверх — хук `compose`.

## Типові роути: інтерцептор замість тіла (owner)

Роут статистики не мусить сам кликати сервіс статистики. Достатньо позначити його як роут статистики: інтерцептор
отримує вже провалідований query, передає його в `StatsService` разом з декларацією і повертає результат.

```ts
@Bot(MACONTROL_BOT, { namespace: 'groups' })
export class GroupsBot {
  @StatsRoute('stats', GROUPS_UI_STATS, { title: 'Статистика' })
  stats(@RouteQuery() _query: GroupsStatsQuery) {}   // тіла немає: дані дає StatsInterceptor
}

export class GroupsStatsQuery extends StatsQuery {   // period — з бази
  @UiFilter({ kind: 'select', label: 'Подія', options: GROUPS_STAT })
  @IsOptional() @IsIn(Object.values(GROUPS_STAT))
  key?: GroupsStatKey;
}
```

- `@StatsRoute` = `@UiRoute(path, { layout: 'stats' })` + `SetMetadata(STATS_DECL, decl)` + `UseInterceptors(StatsInterceptor)`.
- Порядок: валідація DTO (pipe) → `StatsInterceptor` → `StatsService.charts(decl, query)` → лейаут `stats`.
- Якщо метод щось повертає (не `undefined`), інтерцептор бере це замість типового результату: модуль може
  перевизначити дані, не відмовляючись від роуту.
- Той самий прийом для інших типових сторінок: `@ListRoute` (історія сесій, журнал), `@SettingsRoute`.

## Telegram

Той самий роут дає екран бота: фільтри DTO → inline-кнопки з `params`. Обмеження: `callback_data` ≤ 64 байти,
тож ключі й значення параметрів короткі. Нативного вкладеного меню в Telegram немає (команди пласкі, menu button —
команди або `web_app`); вкладеність — наші екрани з `go` / `back`.

## Перевірка на старті

Роутер знає `Map<namespace, Set<action | route>>`. Кожен `action` у дереві звіряється з нею в dev на кожному
збиранні і в тестах; назви дій модуля — типізований юніон, не довільний рядок.

## Перехід

1. `@UiRoute`, `@RouteQuery`, `@UiFilter`, лейаут `stats`, `StatsInterceptor`.
2. Сторінки статистики (Awake, Sleeper, Webhooxy, Telegram, Агент, Групи) — на `@StatsRoute`; `UiModuleStats`
   лишається декларацією, яку бере інтерцептор.
3. Списки й налаштування — далі; `pages(ctx)` живе поруч, поки всі сторінки не на роутах.

## Відкриті питання

- **Фільтри: спільні чи свої в кожного клієнта.** Зараз період — налаштування сервера (змінив у вебі — змінилось
  скрізь). З DTO роуту фільтр стає параметром запиту, як query в URL: у кожного клієнта свій. Вирішує owner.
- Де живе роут: у класі `@Bot` (один роутер на бот і UI) чи окремий `@UiController` поруч.
- Меню бота: Mini App (`web_app`, потрібні HTTPS і вхід через `initData`) чи reply keyboard з розділами.
