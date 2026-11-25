# SQLite mini-ORM (`@my-nestjs-kit/sqlite`) — spec

> Джерело ORM тепер — репо `~/projects/nest-sqlite-lib` (`docs/spec.md` там актуальний). Цей файл — історія виносу з awake.

Статус: draft, 2026-11-23. Код ще не писали. План переходу: [plans/2026-11-23-sqlite-orm-plan.md](plans/2026-11-23-sqlite-orm-plan.md).

## Навіщо

Зараз `agent/src/database/database.service.ts` — один `DatabaseSync`, у конструкторі `CREATE TABLE IF NOT EXISTS` на всі 11 таблиць і шість приватних `_migrateX()`, а 10 репозиторіїв пишуть сирий SQL і руками мапають `snake_case` рядки в контракти (`toRecord`). Проблеми:

- схема всіх модулів живе в одному файлі, модуль не володіє своєю таблицею;
- міграції — приватні методи без історії: не видно, що вже виконано, немає `down`, порядок тримається порядком викликів у конструкторі;
- кожен репозиторій повторює `prepare(...).all() as unknown as Row[]` + мапінг колонок.

Мета: маленький ORM поверх `node:sqlite` у стилі NestJS-кіта — entity на декораторах, `DataSource`, generic repository, міграції класами з таблицею виконаних. Спочатку це shim в агенті, потім пакет `@my-nestjs-kit/sqlite`.

## Обмеження

- Драйвер тільки `node:sqlite` (`DatabaseSync`, Node ≥ 22.5; у нас 26). Жодних native addons: агент — один `dist/agent.cjs` від esbuild, який запускає Mac-аппка; `better-sqlite3` ламає single-file bundle і прив'язує бінарник до ABI Node.
- API синхронний. Отже транзакція — синхронна функція: `await` всередині віддав би чергу іншому коду, який виконався б у тій самій транзакції. `transaction(fn)` кидає помилку, якщо `fn` повертає `Promise`.
- Одне з'єднання на процес, один процес — конкурентних писачів немає.
- Relations — лише завантаження за запитом (`relations` в опціях читання). Без identity map, unit of work і каскадного збереження: це table mapper з relations, не повний ORM.
- Декоратори не залежать від `emitDecoratorMetadata`: тип колонки задається явно (esbuild метадані не пише, хоча зараз їх пише `tsc` перед bundle).

## Чи взяти готовий ORM

| Варіант | `node:sqlite` | Декоратори / класи | Міграції up/down класами | Nest | Висновок |
|---|---|---|---|---|---|
| TypeORM | немає (лише `better-sqlite3`/`sqlite3`, native) | так | так | `@nestjs/typeorm` | відпадає через native driver |
| Drizzle | так, `drizzle-orm/node-sqlite` | ні: схема функціями `sqliteTable()` | `drizzle-kit` генерує SQL, тільки up | немає офіційного | найлегший готовий варіант, але інша модель (schema-as-code, без DI-міграцій) |
| MikroORM 7 | так, через `NodeSqliteDialect` (Kysely bridge) | так | так, класи `Migration` з up/down | `@mikro-orm/nestjs` | найближчий до бажаного API, але важкий: unit of work, identity map, discovery, dynamic require — ризики для esbuild bundle і старту аппки |
| Kysely | через той самий bridge | ні, query builder | свій Migrator (up/down) | немає | хороший як нижній шар, не як ORM |

**Рекомендація: свій mini-ORM.** Потрібна частина невелика (~600–800 рядків: metadata, мапінг, generic CRUD, runner міграцій), повністю під контролем, без залежностей, і точно така, як конвенції кіта (`forRoot` / `forFeature`, `BaseRepository`, міграції в опціях модуля). Імена декораторів беремо з TypeORM (`@Entity`, `@Column`, `@PrimaryGeneratedColumn`, `@Index`), щоб код читався як решта кіта і щоб перехід на TypeORM/MikroORM, якщо колись знадобиться, був механічним.

Якщо свій ORM не потрібен — запасний варіант Drizzle: нативний `node:sqlite`, без native addon, легкий. Ціна: відмова від класів-entity і DI-міграцій.

## Модель

### Entity

```ts
@Entity('sessions')
@Index(['startedAt'])
export class SessionEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'text' }) startedAt!: string;
  @Column({ type: 'text', nullable: true }) endedAt!: string | null;
  @Column({ type: 'text' }) source!: SessionSource;
  @Column({ type: 'integer', nullable: true }) batteryStart!: number | null;
}
```

- Ім'я колонки за замовчуванням — `snake_case` від поля (`startedAt` → `started_at`), `name` перекриває. Naming strategy — опція `forRoot`.
- Типи: `text | integer | real | blob | boolean | json`. `boolean` ↔ `0/1`, `json` ↔ `TEXT` через `JSON.stringify/parse`. Свої — через `transformer: { to, from }`.
- Опції колонки: `nullable`, `default` (SQL-вираз рядком), `unique`, `references: { entity: () => DeviceEntity, onDelete }`.
- `@PrimaryColumn()` для природних ключів (`trusted_networks.ssid`), `@PrimaryColumn()` на кількох полях — складений ключ (`settings`, `metric_snapshots`).
- `@PrimaryGeneratedColumn('increment' | 'uuid')`.
- `@Index(fields, { unique?, name? })` на класі.
- `@DeleteDateColumn()` (`deletedAt`, `TEXT NULL`, ISO-час) вмикає soft delete для entity — див. «Soft delete».
- `@CreateDateColumn()` / `@UpdateDateColumn()` — `createdAt` / `updatedAt`, база ставить ISO-час сама при `create` / `update`.
- Entity реалізує контракт з `@awake/contracts` (`implements SessionRecord`), тож мапер `toRecord` зникає: репозиторій повертає entity, яка вже має форму контракту.

Метадані: глобальний `MetadataStorage` (`WeakMap<Class, EntityMeta>`), декоратори лише пишуть у нього. Збирання — при `forFeature` (явний список). Скан усіх `@Entity` через `DiscoveryService` — пізніше, коли з'явиться потреба.

### DataSource

`SqliteDataSource` — обгортка над `DatabaseSync`:

- `open()` створює директорію, відкриває файл, ставить `pragmas` з опцій (за замовчуванням `journal_mode = WAL`, `foreign_keys = ON`).
- `prepare(sql)` з кешем statements за текстом SQL.
- `transaction(fn)`: `BEGIN` / `COMMIT` / `ROLLBACK`; вкладений виклик → `SAVEPOINT`. Відмовляє на `Promise`.
- `getRepository(Entity)`, `query(sql, params)`, `exec(sql)`.
- `close()` у `onApplicationShutdown` (остання фаза: stats flush пише в `beforeApplicationShutdown`).

### Repository

Повторює `BaseRepository<E, QForOne, QForMany>` скіла `nestjs` (`references/repositories.md`): три generics завжди явні, публічний API — лише базовий, фільтри — поля query-класу, а не нові іменовані методи.

```ts
export class SqliteRepository<E, QForOne, QForMany extends FindManyQueryBase> {
  findOne(query: QForOne, opts?: SqliteFindOpts<E>): E | null
  findOneOrFail(query: QForOne, opts?: SqliteFindOpts<E>): E
  findMany(query: QForMany, opts?: SqliteFindOpts<E>): E[]
  count(query: QForMany): number
  create(dto: CreateDto<E>): E                 // id з lastInsertRowid
  createMany(dtos: CreateDto<E>[]): void       // в одній транзакції
  update(query: QForOne, dto: UpdateDto<E>): number
  upsert(dto: CreateDto<E>, opts: SqliteUpsertOpts<E>): void
  delete(query: QForOne): number              // soft, якщо в entity є @DeleteDateColumn; інакше DELETE
  restore(query: QForOne): number              // лише soft-delete entity
  hardDelete(query: QForOne): number           // фізичне DELETE, явно

  protected _applyWhere(where: SqliteWhereBuilder<E>, query: Partial<QForOne> & Partial<QForMany>): void
  protected _qb(alias: string): SqliteQueryBuilder<E>                        // складні запити — лише через QB
}
```

**Жодної інлайн-типізації в сигнатурах репозиторію** (`create(data: { tokenHash: string; … })`, `findMany(query: { limit: number })`). Кожен вхід — названий тип у своєму файлі за розкладкою модуля зі скіла:

```
src/devices/
├── entities/device.entity.ts                 DeviceEntity implements DeviceRecord
├── dto/create-device.dto.ts                  CreateDeviceDto
├── dto/update-device.dto.ts                  UpdateDeviceDto extends IdQuery
├── query/find-one-device.query.ts            FindOneDeviceQuery extends IdQuery { tokenHash?: string }
├── query/find-many-devices.query.ts          FindManyDevicesQuery extends FindManyQueryBase
└── repositories/devices.repository.ts        DevicesRepository extends SqliteRepository<DeviceEntity, FindOneDeviceQuery, FindManyDevicesQuery>
```

- DTO і query — класи без декораторів валідації: в агенті вони не приходять з HTTP напряму (`class-validator` у бандлі немає). Де вхід з HTTP — валідацію робить контроллер як зараз, DTO лишається тим самим класом.
- Спільні query-трейти — у `src/database/query/` за скілом (`pagination-sort-search.md`): `PaginationQuery` + `HasPaginationQuery` (`pagination: { limit, offset }`), `SortQuery` через `HasSortQueryOf(fields)`, `FindManyQueryBase` їх збирає. `findMany({ pagination: { limit: 50 } })` замість `findMany({ limit })`.
- `SqliteFindOpts<E>` — усе, що не є фільтром домену, один тип для всіх методів читання:

  ```ts
  interface SqliteFindOpts<E> {
    select?: SelectOf<E>[];            // поля entity; id додається завжди
    relations?: RelationsOf<E>;        // ['device'] або вкладено { device: { sessions: true } }
    order?: OrderOf<E>;                // { startedAt: 'DESC' }
    withDeleted?: boolean;
    onlyDeleted?: boolean;
  }
  ```

  `SelectOf` / `RelationsOf` / `OrderOf` виводяться з entity: поле, якого немає, — помилка компіляції, а не тихий no-op.
- Репозиторій без `select` читає всі колонки; з `select` — лише їх (решта полів у entity `undefined`). Relations у `select` вказуються так само вкладено (`select: ['id', 'device.userAgent']` — поза v1, у v1 select лише кореня).
- Коли параметрів не вистачає (агрегати, `json_each`, умови між полями), метод репозиторію бере `_qb()` — той самий «qb lite», що нижче, з тими самими `select` / `relations` / операторами.
- `_applyWhere` типізований як `Partial<QForOne> & Partial<QForMany>` (не `Record<string, unknown>`). Скалярні поля query-класу база перетворює на рівність сама (`null` → `IS NULL`, масив → `IN`). Override — лише для поля з особливою умовою (`endedAt: 'open'` → `ended_at IS NULL`, діапазон дат, JSON-шлях).
- Результат з кількома полями теж названий тип у `types/` модуля, не інлайн (`touch(...): { id; userAgent; previousSeenAt }` → `DeviceTouchResult`).
- Складне (`json_each` і `SUM` у `metric_snapshots`) — через `_qb()`, вхід і вихід методу — названі типи (`StatFilter`, `StatCellRow`).

Модульний репозиторій не додає обгорток над `findOne`/`findMany` (антипатерн скіла); метод з власною логікою — дозволений:

```ts
@EntityRepository(SessionEntity)
export class SessionsRepository extends SqliteRepository<SessionEntity, FindOneSessionQuery, FindManySessionsQuery> {
  protected override _applyWhere(where: SqliteWhereBuilder<SessionEntity>, query: Partial<FindOneSessionQuery> & Partial<FindManySessionsQuery>) {
    const { open, ...rest } = query;
    super._applyWhere(where, rest);
    if (open !== undefined) where.isNull('endedAt', open);
  }
}

// сервіс
this._sessions.update({ open: true }, closeSessionDto);   // closeSessionDto: CloseSessionDto
```

### Жодного SQL у модулях

У репозиторіях і сервісах модулів немає тексту SQL: ні `prepare('SELECT …')`, ні `_database.db`, ні шаблонних рядків з умовами. Запит описується параметрами методів бази (`findMany(query, opts)`, `update(query, dto)`) або, коли їх не вистачає, query builder-ом. SQL пишуть лише:

- сам пакет (`@nest-kit/sqlite`: `SqliteRepository`, builder, runner);
- міграції (`src/database/migrations/`): схема — текст за визначенням, і виконана міграція не повинна залежати від entity.

`SqliteDataSource` модулям не інжектиться (його експорт лишається для пакета й міграцій). Перевірка — скрипт `scripts/check-no-raw-sql.mjs` у `build`: `\.prepare\(|\.exec\(|_database\.db|SqliteDataSource|DatabaseSync` у `src/**` поза `src/nest-kit/` і `src/database/migrations/` — помилка збірки.

### Query builder

`SqliteQueryBuilder<E>` — для того, що не вкладається в `findMany`: агрегати, групування, `json_each`, умови між полями. Поля — імена властивостей entity (`'m.periodStart'`), builder сам мапить їх у колонки й підставляє параметри; рядка SQL зовні немає.

```ts
sumCells(filter: StatFilter): StatCellRow[] {
  return this._qb('m')
    .jsonEach('v', 'm.metrics')            // json_each(m.metrics) v
    .jsonEach('s', 'v.value')              // json_each(v.value) s
    .select({ periodStart: 'm.periodStart', value: 'v.key', status: 's.key' })
    .sum('s.value', 'count')
    .applyQuery(filter)                    // StatFilter → умови через _applyWhere репозиторію
    .where('m.periodStart', Between(from, to))
    .groupBy('m.periodStart', 'v.key', 's.key')
    .getRawMany<StatCellRow>();
}
```

API v1 (стільки, скільки треба наявним запитам агента; нове — коли знадобиться):

- `where(field, valueOrOperator)` / `andWhere` / `orWhere(group)` — значення або find-оператор (нижче), рядкових `op` немає;
- `applyQuery(query)` — те саме перетворення query-класу, що в `findMany` (типи `Partial<QForOne> & Partial<QForMany>`), разом з `_applyWhere` override модуля і фільтром soft delete;
- `select(map)`, `count(alias)`, `sum(field, alias)`, `min`, `max`, `groupBy`, `orderBy(field, dir)`, `limit`, `offset`;
- `jsonEach(alias, field)` — table-valued `json_each` з колонками `key` / `value`;
- `innerJoin(relation, alias)` / `leftJoin(relation, alias)` за метаданими relation (умова з `joinColumn`, без тексту `ON`); `relations(spec)` і `select(fields)` — ті самі, що в `SqliteFindOpts`;
- `withDeleted()` / `onlyDeleted()`;
- кінцеві: `getMany(): E[]` (мапінг у entity), `getOne(): E | null`, `getRawMany<R>(): R[]` (лише поля з `select`, тип — названий), `getCount()`, `exists()`;
- `update(dto)` / `delete()` / `softDelete()` на тих самих умовах — для масових змін (`deleteOlderThan` статистики).

`getRawMany` повертає числа з `SUM` як `number` (не `bigint`), порожній `subject_id` мапить репозиторій, не builder.

### Find-оператори

Умова, яка не є рівністю, задається helper-ом, а не рядком чи SQL. Назви й поведінка — як у TypeORM, щоб код читався однаково з рештою кіта:

| Helper | SQL | Примітка |
|---|---|---|
| `Equal(v)` | `= ?` | явна рівність; голе значення — те саме |
| `Not(v \| op)` | `!= ?` / `NOT (…)` | `Not(IsNull())` → `IS NOT NULL`, `Not(In([…]))` → `NOT IN`, `Not(Like(…))` |
| `IsNull()` | `IS NULL` | голий `null` у query — те саме |
| `In(values)` | `IN (?, …)` | голий масив — те саме; порожній масив → завжди false (`0 = 1`), не синтаксична помилка |
| `Between(a, b)` | `>= ? AND <= ?` | включно з обох боків, як у TypeORM |
| `LessThan` / `LessThanOrEqual` / `MoreThan` / `MoreThanOrEqual` | `< <= > >=` | |
| `Like(pattern)` | `ts_like(?, col, 0)` | з урахуванням регістру, `%` / `_` |
| `ILike(pattern)` | `ts_like(?, col, 1)` | без урахування регістру, включно з кирилицею |
| `And(...ops)` | `(… AND …)` | кілька умов на одне поле (`And(MoreThan(a), Not(b))`) |

- Тип: `FindOperator<T>` — клас з `type` і значеннями; компіляція в SQL — лише в пакеті (`repository/helpers/build-where.ts`).
- Де працюють: значення полів query-класу (`startedAt?: string | FindOperator<string>`), `where.field(name, op)` в `_applyWhere` override, `qb.where(field, op)`. Один компілятор на всі три.
- Чому `Like` / `ILike` через свою функцію: вбудований `LIKE` у SQLite для ASCII завжди без регістру, а `lower()` / `NOCASE` не знають кирилиці (`'Ключ'` ≠ `'ключ'`). DataSource при відкритті реєструє детерміновану `ts_like(pattern, value, ci)` через `db.function()`: JS перетворює шаблон у RegExp (`%` → `.*`, `_` → `.`, решта екранується, `ci` → прапорець `iu`). Ціна — такий фільтр не використовує індекс; для пошуку по великих таблицях — окремо (FTS5), поза v1.
- `Raw(sql)` немає навмисно — це був би SQL у модулі.

### Стан — це час, не bool

Перемикач стану рядка зберігається як nullable ISO-час події, а не як `boolean`: `disabledAt`, `activatedAt`, `revokedAt`, `endedAt`, `archivedAt`, `deletedAt`. `NULL` — стану немає, значення — стан є і відомо, коли він настав. Так одна колонка дає і прапорець, і момент (для статистики, сортування, очищення за віком), а «вимкнули й увімкнули знову» не губить, що стан колись змінювався, без окремої колонки.

- Entity: `@StateDateColumn() disabledAt!: string | null` (це `@Column({ type: 'text', nullable: true })` + позначка в метаданих, що поле — стан). Ім'я поля завжди `<participle>At`.
- Query: для кожної state-колонки query-клас може мати булеве поле без `At` — `disabled?: boolean`. База в `_applyWhere` перетворює його сама: `true` → `Not(IsNull())`, `false` → `IsNull()`; override у модулі не потрібен. Діапазон часу (`disabledBefore`) — уже поле з override.
- Зміна стану — `update(query, dto)` з `disabledAt: now` / `disabledAt: null` у названому DTO (`DisableWebhookDto`), не окремі `disable()` / `enable()` в репозиторії.
- Контракт назовні може віддавати і час, і похідний bool (`disabled: boolean` у відповіді Web UI), але в БД і entity джерело одне — колонка часу.
- `deletedAt` — той самий патерн з одним доповненням: база виключає такі рядки з пошуку за замовчуванням (нижче).
- Не стан, а факт події (`bot_events.ok` — чи вдалася дія) лишається `boolean`: у нього немає «коли настав», він не перемикається.

В агенті вже так: `webhooks.disabled_at` / `deleted_at`, `web_sessions.revoked_at`, `sessions.ended_at`, `sleep_timers.ended_at`.

### Relations

Скіл вимагає обидві половини зв'язку (`entities.md`, `queries-and-interfaces.md`): колонка `<name>Id` і властивість `<name>`. Так само тут:

```ts
@Entity('web_sessions')
export class WebSessionEntity implements WebSessionRecord {
  @Column({ type: 'integer' }) deviceId!: number;
  @ManyToOne(() => DeviceEntity, { joinColumn: 'deviceId', onDelete: 'CASCADE' })
  device?: DeviceEntity | null;
}

@Entity('devices')
export class DeviceEntity implements DeviceRecord {
  @OneToMany(() => WebSessionEntity, (session) => session.device)
  webSessions?: WebSessionEntity[];
}
```

- Декоратори: `@ManyToOne(target, { joinColumn, onDelete? })`, `@OneToOne(target, { joinColumn? })` (сторона з `joinColumn` — власник), `@OneToMany(target, inverse)`. `target` — завжди `() => Class` (одна форма на проєкт, як у скілі). FK у SQL-схемі пише міграція, `onDelete` у декораторі — лише для `schema:sql` і `SchemaInspector`.
- Властивість relation опційна (`device?:`): без `relations` у запиті її немає взагалі, а не `null`. `null` означає «завантажили, зв'язку немає».
- Завантаження:
  - `ManyToOne` / `OneToOne` — `LEFT JOIN` в тому самому запиті, колонки під alias `<relation>__<column>`, мапер збирає вкладений об'єкт.
  - `OneToMany` — другий запит `WHERE <fk> IN (<ids батьків>)` і розкладання по батьках. Не JOIN: він множить рядки кореня і ламає `limit` / `offset`.
  - Вкладені (`{ device: { webSessions: true } }`) — рекурсивно тими самими правилами; глибина обмежена 3, щоб випадково не витягти всю БД.
- Фільтр за полем relation — поле query-класу (`deviceUserAgent?: FindOperator<string>`) з override `_applyWhere`, який робить join через `where.joined('device', 'userAgent', op)`. Для разового складного випадку — `_qb().innerJoin('device', 'd')`.
- Запис relation не зберігає: `create` / `update` пишуть лише колонки кореня (`deviceId`), вкладений `device` ігнорується.

### Soft delete

Вмикається колонкою `@DeleteDateColumn() deletedAt!: string | null` в entity (назви як у TypeORM). Без неї репозиторій поводиться як звичайний.

- `delete(query)` → `UPDATE … SET deleted_at = <now> WHERE <query> AND deleted_at IS NULL`; повертає кількість позначених рядків. Повторне видалення — 0, не помилка.
- Пошук виключає видалені завжди: `findOne`, `findOneOrFail`, `findMany`, `count`, `update`, `upsert` (конфлікт з видаленим рядком — див. нижче) додають `deleted_at IS NULL` у `_applyWhere` бази, тож override у модулі не може про це забути.
- Видалені бачить лише явний запит: `SqliteFindOpts.withDeleted: true` (усі) або `onlyDeleted: true` (кошик). Це опції, не поле query-класу: фільтр домену і режим видимості не змішуються.
- `restore(query)` знімає позначку (`deleted_at = NULL`) лише з видалених рядків.
- `hardDelete(query)` — фізичне `DELETE`, окремим методом, щоб його не можна було викликати випадково через `delete`. Для очищення кошика за віком — `hardDelete` з query-полем `deletedBefore` у `_applyWhere` модуля.
- `_qb()` додає `deleted_at IS NULL` для кореневого alias так само; `.withDeleted()` / `.onlyDeleted()` на builder — явний виняток.
- UNIQUE і soft delete: звичайний `UNIQUE` заважає створити рядок з тим самим ключем після видалення. Для таких полів міграція робить частковий індекс `CREATE UNIQUE INDEX … WHERE deleted_at IS NULL` замість `UNIQUE` у колонці. `upsert` по такому ключу конфліктує лише з живим рядком.
- Каскад soft delete на пов'язані таблиці — поза v1; `ON DELETE CASCADE` спрацьовує лише на `hardDelete`. Relation на soft-deleted рядок завантажується як `null` (у `OneToMany` — без нього), якщо не передано `withDeleted`.

Перший споживач — `webhooks` (`deleted_at` уже є, зараз фільтрується руками в репозиторії).

### Module

```ts
SqliteModule.forRootAsync({
  inject: [AGENT_CONFIG],
  useFactory: (config: AgentConfig) => ({ path: config.dbPath, pragmas: { ... } }),
  migrations: [BaselineMigration, RelaySourceMigration, remoteAccessMigration],
})

SqliteModule.forFeature({ entities: [SessionEntity], repositories: [SessionsRepository] })
```

- `forRootAsync` — `@Global()`, експортує `SqliteDataSource`.
- `forFeature` реєструє repository-провайдери: generic за токеном `getRepositoryToken(Entity)` (`@InjectRepository(SessionEntity)`) або клас з `@EntityRepository`.
- `migrations` — поле опцій модуля, як `imports`: масив класів або об'єктів. Вони не можуть бути в `useFactory`, бо класи треба зареєструвати провайдерами до виклику factory.

### Міграції

Дві форми, обидві в одному масиві `migrations`:

```ts
// клас: потрібен DI
@Migration('2026-11-23-002-relay-source')
export class RelaySourceMigration implements MigrationInterface {
  constructor(@Inject(AGENT_CONFIG) private readonly _config: AgentConfig) {}
  up(ctx: MigrationContext) { ... }
  down(ctx: MigrationContext) { ... }
}

// об'єкт: без DI
export const remoteAccessMigration = defineMigration({
  name: '2026-11-23-007-remote-access',
  up: (ctx) => ctx.exec(`...`),
});
```

- Таблиця `_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`.
- Порядок — сортування за `name` (префікс дата + номер), а не позиція в масиві. Дубль імені — помилка старту.
- Кожна міграція в окремій транзакції разом із записом у `_migrations`. Помилка → rollback, агент не стартує (краще, ніж робота на напівміграній схемі).
- Запуск — у factory `SqliteDataSource`: провайдер з'являється вже мігрованим, тож будь-який репозиторій у конструкторі чи `onModuleInit` бачить актуальну схему (як зараз, коли схема в конструкторі `DatabaseService`). Наслідок: клас міграції не може інжектити `SqliteDataSource` чи репозиторії (цикл) — БД він отримує через `ctx`.
- `down` опційний. `MigrationsService.revert({ to?: name, steps?: number })` відкочує у зворотному порядку; міграція без `down` зупиняє відкат з помилкою. Виклик — dev-командою агента (`node dist/agent.cjs migrate:down --steps 1`), не з Web UI.
- `MigrationContext`: `db`, `exec`, `query`, `hasTable`, `hasColumn`, `addColumnIfMissing(table, column, definition)`, `dropColumnIfExists`. Ідемпотентні, бо БД, створена до міграцій, могла вже мати зміну.
- Транзакцію дає runner: свої `BEGIN` / `COMMIT` у міграції заборонені (вкладений `BEGIN` у SQLite падає). Pragmas (`journal_mode = WAL`) — лише в опціях DataSource: у транзакції WAL не вмикається.
- Міграція не посилається на entity (`ctx.createTable(SessionEntity)` заборонено): entity змінюється, а виконана міграція має давати той самий результат завжди. SQL для нової таблиці дає dev-утиліта `schema:sql <Entity>`, його вставляють у міграцію текстом.
- Dev-перевірка дрейфу: після міграцій у dev-стейджі `SchemaInspector` порівнює `PRAGMA table_info` з метаданими entity і пише warning на розбіжність (колонка є в entity, немає в БД, інший тип/nullable).

## Захист від SQL injection і DoS

- Значення — завжди параметри `?` (поля query, оператори, шаблони `Like`/`ILike`, DTO).
- Ідентифікатори — лише з метаданих entity, у лапках `quoteIdentifier`; невідоме поле (where, select, order, conflict, relations, поля QB) — помилка.
- Що йде в текст SQL без параметра, перевіряється в рантаймі (`helpers/`): напрямок сортування — `ASC`/`DESC` (`assertOrderDirection`), `limit`/`offset` — ціле ≥ 0 (`assertRowCount`), ім'я pragma / таблиці / колонки в хелперах міграцій — `[A-Za-z_][A-Za-z0-9_]*` (`assertSqlName`), значення pragma — число або слово (`assertPragmaValue`). `hasColumn` — через `pragma_table_info(?)`.
- `ts_like` — лінійний wildcard-matcher по кодових точках, не RegExp (немає ReDoS на `%a%a…%b`); підряд `%` схлопуються, шаблон довший за 500 символів — помилка запиту.
- SQL міграцій (`exec`, `definition` у `addColumnIfMissing`) — текст автора міграції, не вхід користувача.

## Розкладка shim

```
agent/src/nest-kit/
├── README.md                 що лежить у shim і куди переїде
└── sqlite/                   // TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
    ├── index.ts
    ├── sqlite.module.ts
    ├── data-source/sqlite-data-source.ts
    ├── metadata/{metadata-storage.ts, entity-meta.types.ts, naming-strategy.ts}
    ├── decorators/{entity,column,many-to-one,one-to-one,one-to-many,primary-column,primary-generated-column,state-date-column,create-date-column,update-date-column,delete-date-column,index,entity-repository,inject-repository,migration}.decorator.ts
    ├── repository/{sqlite-repository.ts, helpers/build-where.ts, helpers/map-row.ts}
    ├── query-builder/{sqlite-query-builder.ts, helpers/compile-query.ts, types/query-builder.types.ts}
    ├── operators/{find-operator.ts, equal.ts, not.ts, is-null.ts, in.ts, between.ts, less-than.ts, less-than-or-equal.ts, more-than.ts, more-than-or-equal.ts, like.ts, i-like.ts, and.ts, index.ts}
    ├── data-source/helpers/register-ts-like.ts
    ├── migrations/{migrations-runner.ts, migrations.service.ts, define-migration.ts, migration-context.ts, types/migration.types.ts}
    └── schema/{schema-sql.ts, schema-inspector.ts}
```

Імпорт тільки через alias `@nest-kit/sqlite`. Кожен файл починається з `// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite`.

## Поза v1

Збереження relations разом з коренем (cascade insert/update), `ManyToMany` з проміжною таблицею, `select` полів relation, allowlist для client-driven `select` / `relations` з HTTP (`@Select()` / `@RelationField()` скіла — коли Web UI почне їх передавати), авто-скан entity, генерація міграцій з diff, кілька з'єднань, async-драйвери (libSQL / D1). Додаються, коли знадобляться другому споживачу пакета.
