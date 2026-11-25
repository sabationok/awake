// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { Type } from '@nestjs/common';
import type { MigrationContext } from '../migration-context';

/**
 * Міграція синхронна, як і `node:sqlite`: runner виконує її в транзакції разом із записом у `_migrations`.
 * Свої BEGIN / COMMIT усередині заборонені — вкладений BEGIN у SQLite падає.
 */
export interface MigrationInterface {
  up(ctx: MigrationContext): void;
  /** Без `down` відкат зупиняється на цій міграції з помилкою. */
  down?(ctx: MigrationContext): void;
}

/** Міграція без DI: колбеки й ім'я. */
export interface MigrationObject extends MigrationInterface {
  name: string;
}

export type MigrationEntry = Type<MigrationInterface> | MigrationObject;

/** Міграція, готова до виконання: клас уже інстанційовано через DI. */
export interface ResolvedMigration {
  name: string;
  migration: MigrationInterface;
}

export interface AppliedMigration {
  name: string;
  appliedAt: string;
}

export interface RevertMigrationsOptions {
  /** Скільки останніх виконаних відкотити (за замовчуванням 1). */
  steps?: number;
  /** Відкотити все після цієї міграції; вона сама лишається. Має перевагу над `steps`. */
  to?: string;
}
