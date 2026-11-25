// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';
import type { SqliteModuleOptions } from '../types/sqlite-module-options.types';

import { assertPragmaValue } from '../helpers/assert-pragma-value';
import { assertSqlName } from '../helpers/assert-sql-name';
import { registerTsLike } from './helpers/register-ts-like';

const STATEMENT_CACHE_LIMIT = 300;

const isThenable =(value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | null)?.then === 'function';

/** Одне з'єднання `node:sqlite` на процес: кеш statements і синхронні транзакції з savepoint для вкладених. */
export class SqliteDataSource {
  readonly db: DatabaseSync;
  private readonly _statements = new Map<string, StatementSync>();
  private _txDepth = 0;

  constructor(options: SqliteModuleOptions) {
    if (options.path !== ':memory:') mkdirSync(dirname(options.path), { recursive: true });
    this.db = new DatabaseSync(options.path);
    for (const [key, value] of Object.entries(options.pragmas ?? {})) this.db.exec(`PRAGMA ${assertSqlName('pragma', key)} = ${assertPragmaValue(key, value)}`);
    registerTsLike(this.db);
  }

  get isOpen(): boolean {
    return this.db.isOpen;
  }

  get inTransaction(): boolean {
    return this._txDepth > 0;
  }

  /**
   * Statement з кешу за текстом SQL. SQLite сам перепідготує його після зміни схеми.
   * Кеш обмежений: `In([...])` різної довжини дає різний текст.
   */
  prepare(sql: string): StatementSync {
    let statement = this._statements.get(sql);
    if (!statement) {
      statement = this.db.prepare(sql);
      if (this._statements.size >= STATEMENT_CACHE_LIMIT) this._statements.delete(this._statements.keys().next().value!);
      this._statements.set(sql, statement);
    }
    return statement;
  }

  run(sql: string, ...params: SQLInputValue[]): { changes: number; lastInsertRowid: number } {
    const result = this.prepare(sql).run(...params);
    return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  query<R = Record<string, unknown>>(sql: string, ...params: SQLInputValue[]): R[] {
    return this.prepare(sql).all(...params) as R[];
  }

  /**
   * `fn` має бути синхронною: API `node:sqlite` синхронний, і `await` усередині віддав би чергу коду,
   * який виконався б у цій самій транзакції. Promise у результаті — rollback і помилка.
   * Вкладений виклик — SAVEPOINT: його помилка відкочує лише його частину, якщо зовнішній код її перехопив.
   */
  transaction<T>(fn: () => T): T {
    const depth = this._txDepth;
    const savepoint = `sp_${depth}`;
    this.db.exec(depth === 0 ? 'BEGIN' : `SAVEPOINT ${savepoint}`);
    this._txDepth++;
    try {
      const result = fn();
      if (isThenable(result)) {
        Promise.resolve(result).catch(() => undefined);
        throw new Error('SqliteDataSource.transaction: fn returned a Promise; transactions over node:sqlite must be synchronous');
      }
      this.db.exec(depth === 0 ? 'COMMIT' : `RELEASE ${savepoint}`);
      return result;
    } catch (error) {
      this.db.exec(depth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
      throw error;
    } finally {
      this._txDepth--;
    }
  }

  hasTable(name: string): boolean {
    return this.query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", name).length > 0;
  }

  hasColumn(table: string, column: string): boolean {
    return this.query<{ name: string }>('SELECT name FROM pragma_table_info(?)', table).some((existing) => existing.name === column);
  }

  close(): void {
    this._statements.clear();
    if (this.db.isOpen) this.db.close();
  }
}
