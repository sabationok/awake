# nest-kit shims

Тимчасові копії пакетів `@my-nestjs-kit/*`, яких у кіті ще немає. Звичайні папки, не npm-пакети.
Імпорт лише через alias `@nest-kit/*` (`tsconfig.json` `paths` + плагін `nest-kit-shim` у `scripts/bundle.mjs`).
Коли кіт випустить пакет: імпорти → `@my-nestjs-kit/<pkg>`, shim видалити (робить nest-kit-maintainer).
Поки shim не перевірений в агенті, у кіт його не переносимо.

| Папка | Цільовий пакет | Що є |
|---|---|---|
| `sqlite/` | `@my-nestjs-kit/sqlite` | `SqliteModule.forRootAsync` (з'єднання `node:sqlite`, pragmas, `migrations` в опціях), `SqliteDataSource` (кеш statements, синхронні транзакції + savepoint, `ts_like`), міграції класами `@Migration(name)` і об'єктами `defineMigration` (`_migrations`, `MigrationsService.revert`). Entity: `@Entity`, `@Column`, `@PrimaryColumn`, `@PrimaryGeneratedColumn`, `@CreateDateColumn`, `@UpdateDateColumn`, `@StateDateColumn`, `@DeleteDateColumn`, `@Index`, `@ManyToOne` / `@OneToOne` / `@OneToMany`. `SqliteRepository<E, QForOne, QForMany>` + `@EntityRepository` (find opts `select` / `relations` / `order` / `withDeleted` / `onlyDeleted`, soft delete, `upsert`), find-оператори (`Equal`, `Not`, `IsNull`, `In`, `Between`, `LessThan(OrEqual)`, `MoreThan(OrEqual)`, `Like`, `ILike`, `And`), `SqliteQueryBuilder` («qb lite»: `jsonEach`, агрегати, join за relation), `FindManyQueryBase` / `PaginationQuery` / `IdQuery`. Джерело — репо `~/projects/nest-sqlite-lib` (тут копія з `vendor.json`; правки ORM — там, через `nest-sqlite-lib-maintainer`, оновлення копії — `sqlite-orm-integrator`). Spec: `~/projects/nest-sqlite-lib/docs/spec.md`. |
