# План: агент на SQLite mini-ORM, потім `@my-nestjs-kit/sqlite`

Spec: [../sqlite-orm-spec.md](../sqlite-orm-spec.md). Кожна фаза — окремий коміт у `dev`, агент після кожної збирається (`pnpm --filter @macontrol/agent build`) і стартує на наявній БД користувача без втрати даних.

## Фаза 0. Каркас shim

1. `agent/tsconfig.json`: `baseUrl` + `paths: { "@nest-kit/*": ["src/nest-kit/*"] }`.
2. `agent/scripts/bundle.mjs`: esbuild-плагін `onResolve(/^@nest-kit\//)` → `dist/tsc/nest-kit/*`. Без нього `tsc` лишить `require('@nest-kit/sqlite')` у `dist/tsc`, а esbuild за `paths` з tsconfig підтягне `.ts` з `src` — без метаданих декораторів, і DI Nest зламається.
3. `agent/src/nest-kit/README.md` + порожній `sqlite/index.ts` з шапкою shim.

## Фаза 1. DataSource і міграції замість `DatabaseService` — зроблено 2026-11-23

Міграції в `agent/src/database/migrations/` (список — `DATABASE_MIGRATIONS`). Перевірено на копії реальної `awake.db`: додалась лише `_migrations` (7 рядків), кількість рядків у всіх таблицях та сама, повторний старт нічого не виконує; чиста БД дає ту саму схему колонок і індексів; клас-міграція з DI, `revert`, відкат міграції з помилкою (зміни й запис не лишаються), відмова відкотити міграцію без `down`, savepoint і заборона async у транзакції. Повний агент (`dist/agent.cjs`) на новій збірці ще не запускали.

1. `SqliteDataSource`, `SqliteModule.forRootAsync`, `MigrationsRunner`, `defineMigration`, `@Migration`, `MigrationContext`, таблиця `_migrations`.
2. Міграції з наявного коду, імена за поточним порядком виконання:
   - `2026-11-23-001-baseline` — весь нинішній блок `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` + `DROP TABLE IF EXISTS bot_messages`. Ідемпотентна, тож на існуючій БД нічого не змінює, а на новій створює схему.
   - `002-relay-source`, `003-devices-via` (`addColumn`), `004-proxy-ids`, `005-webhook-metrics`, `006-bot-metrics`, `007-remote-access` — тіла поточних `_migrateX()` без змін; вони вже ідемпотентні, тому перший запуск на старій БД безпечний.
   - `down` — тільки там, де він осмислений (`003`: `DROP COLUMN via`). Data-міграції (`005`, `006`) без `down`.
3. `DatabaseService` лишається тонким адаптером: `get db() { return this._dataSource.db }`. Репозиторії поки не чіпаємо.
4. Перевірка: копія реальної `awake.db` → старт → `_migrations` має 7 рядків, `PRAGMA table_info` усіх таблиць як до зміни, лічильники статистики ті самі.

## Фаза 2. Entity, repository, переведення модулів — зроблено 2026-11-23

Усі 10 репозиторіїв на `SqliteRepository`, у модулях немає SQL-тексту (`scripts/check-no-raw-sql.mjs` у `build`, одразу в режимі error — порушень не лишилось), `DatabaseService` видалено (пункт 1 фази 3 закрито разом). Перевірено на копії реальної `awake.db` скриптом-порівнянням зі старими запитами (57 перевірок): вибірки, сортування й пагінація кожного репозиторію, `json` / `boolean` колонки, складені ключі й `upsert`, relations в обидва боки (to-one JOIN, to-many другим запитом, вкладено), soft delete / restore / hardDelete, похідні state-фільтри, `Like` / `ILike` на кирилиці, агрегати статистики `sumCells` / `sumSeries` (рядок у рядок зі старим SQL), `addBatch`, `deleteBeyond`, захист від `delete({})` і невідомого поля query. Повний агент на новій збірці не запускали (живий агент займає порти й Telegram).

Відхилення від spec: `PaginationQuery.offset` опційний (скіл хоче обидва поля з defaults); `update` / `delete` / `count` / `exists` приймають `Partial<QForOne> & Partial<QForMany>`, не лише `QForOne`; `forFeature` / `@InjectRepository` (generic-репозиторій за токеном), `schema:sql` і `SchemaInspector` ще не зроблені — жодному модулю не знадобились; `select` полів relation — поза v1, як і в spec.


1. Декоратори, `MetadataStorage`, `SqliteRepository`, `forFeature`, `@EntityRepository`, `@InjectRepository`, `schema:sql`, `SchemaInspector` (dev warning).
   Плюс `SqliteFindOpts` (`select`, `relations`, `order`, `withDeleted` / `onlyDeleted`), relation-декоратори (`@ManyToOne`, `@OneToOne`, `@OneToMany`) з JOIN для to-one і другим запитом для to-many; перший споживач — `web_sessions.device`. Плюс find-оператори (`Equal`, `Not`, `IsNull`, `In`, `Between`, `LessThan(OrEqual)`, `MoreThan(OrEqual)`, `Like`, `ILike`, `And`) з функцією `ts_like` у DataSource, `SqliteQueryBuilder` (API зі spec, рівно під наявні запити агента), `scripts/check-no-raw-sql.mjs` у `build` (спершу в режимі warning, після фази 3 — error), `@StateDateColumn`, `@DeleteDateColumn` і soft delete (`delete` / `restore` / `hardDelete`, `withDeleted` / `onlyDeleted`), спільні `src/database/query/` (`PaginationQuery`, `HasPaginationQuery`, `SortQuery`, `FindManyQueryBase`) і базовий `IdQuery`.
2. Модулі по одному, від простих до складних; у кожному `entities/<entity>.entity.ts` (`implements` контракт), `dto/create-*.dto.ts` / `dto/update-*.dto.ts`, `query/find-one-*.query.ts` / `query/find-many-*.query.ts`, репозиторій `extends SqliteRepository<E, QForOne, QForMany>`. Інлайн-типи в сигнатурах (`create(data: { … })`, `findMany(query: { limit })`) замінюються названими DTO / query, `limit` → `pagination`. Мапер `toRecord` і `Row`-інтерфейс видаляються. `webhooks` переходить на soft delete (ручний фільтр `deleted_at` зникає; `wh_id UNIQUE` лишається, бо `wh_id` не перевикористовується — перевірити):
   `logs` → `trusted-networks` → `settings` (складений ключ, `json`) → `sessions` → `sleep-timers` → `devices` → `web-auth` (FK на `devices`) → `bot-journal` (`boolean ok`) → `webhooks` (`json config`) → `stats` (`metric_snapshots`: entity для upsert, агрегати `json_each` і `deleteOlderThan` — через `_qb()`; у модулі не лишається тексту SQL).
3. Після кожного модуля: збірка, старт, сторінка модуля у Web UI показує ті самі дані.

## Фаза 3. Прибирання

1. Видалити `DatabaseService` / `DatabaseModule`, усі `_database.db` замінити на repository або `SqliteDataSource`.
2. dev-команда `migrate:down` в `main.ts` (тільки `STAGE=dev`).
3. Оновити `CLAUDE.md` агента: нова таблиця — нова міграція в `src/database/migrations/` + entity в модулі; правки `CREATE TABLE IF NOT EXISTS` у коді заборонені.

## Фаза 4. Перенесення в кіт

Робить `nest-kit-maintainer` (власник кіта; сесії проєктів кіт не редагують):

1. Пакет `@my-nestjs-kit/sqlite` з `agent/src/nest-kit/sqlite` без змін API; запис у kit gaps / skill `nestjs` (через `nestjs-skill-maintainer`) про SQLite-шар як реалізацію `BaseRepository`.
2. В агенті: залежність на пакет, імпорти `@nest-kit/sqlite` → `@my-nestjs-kit/sqlite`, видалити shim, alias і плагін у `bundle.mjs`.

## Ризики

- Перший старт нової версії на старій БД — головний ризик. Фаза 1 перевіряється на копії реальної `awake.db` до релізу.
- Міграція, що впала, блокує старт агента; Mac-аппка має показати помилку агента, а не мовчки перезапускати його по колу.
- Синхронна транзакція з `await` усередині — помилка програміста, яку ловить runtime-перевірка `transaction()`.
