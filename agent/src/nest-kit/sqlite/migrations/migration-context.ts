// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type { SqliteDataSource } from '../data-source/sqlite-data-source';
import { assertSqlName } from '../helpers/assert-sql-name';

/**
 * Те, що бачить міграція. Посилань на entity тут немає навмисно: entity змінюється, а виконана міграція
 * має давати той самий результат завжди, тож SQL у міграції пишеться текстом.
 */
export class MigrationContext {
  constructor(private readonly _dataSource: SqliteDataSource) {}

  get db(): DatabaseSync {
    return this._dataSource.db;
  }

  exec(sql: string): void {
    this._dataSource.exec(sql);
  }

  query<R = Record<string, unknown>>(sql: string, ...params: SQLInputValue[]): R[] {
    return this._dataSource.query<R>(sql, ...params);
  }

  hasTable(name: string): boolean {
    return this._dataSource.hasTable(name);
  }

  hasColumn(table: string, column: string): boolean {
    return this._dataSource.hasColumn(table, column);
  }

  /**
   * `ALTER TABLE ADD COLUMN`, якщо колонки ще немає: БД, створена до міграцій, могла вже її мати.
   * Імена перевіряються; `definition` — SQL автора міграції, як і `exec`.
   */
  addColumnIfMissing(table: string, column: string, definition: string): void {
    if (!this.hasColumn(table, column)) this.exec(`ALTER TABLE ${assertSqlName('table', table)} ADD COLUMN ${assertSqlName('column', column)} ${definition}`);
  }

  dropColumnIfExists(table: string, column: string): void {
    if (this.hasColumn(table, column)) this.exec(`ALTER TABLE ${assertSqlName('table', table)} DROP COLUMN ${assertSqlName('column', column)}`);
  }
}
