// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { Type } from '@nestjs/common';
import type { SQLInputValue } from 'node:sqlite';

export type ColumnType = 'text' | 'integer' | 'real' | 'blob' | 'boolean' | 'json';

/** Роль колонки: звичайна, час створення / оновлення, стан (`<x>At`), soft delete. */
export type ColumnRole = 'regular' | 'create-date' | 'update-date' | 'state-date' | 'delete-date';

export interface ColumnTransformer<T = unknown> {
  to(value: T): SQLInputValue;
  from(value: unknown): T;
}

export interface ColumnOptions {
  type: ColumnType;
  /** Ім'я колонки; за замовчуванням `snake_case` поля. */
  name?: string;
  nullable?: boolean;
  transformer?: ColumnTransformer;
}

export interface ColumnMeta {
  property: string;
  name: string;
  type: ColumnType;
  nullable: boolean;
  primary: boolean;
  generated?: 'increment' | 'uuid';
  role: ColumnRole;
  transformer?: ColumnTransformer;
}

export type RelationType = 'many-to-one' | 'one-to-one' | 'one-to-many';

export interface RelationMeta {
  property: string;
  type: RelationType;
  target: () => Type<unknown>;
  /** to-one сторона-власник: поле entity з FK (`deviceId`). */
  joinColumn?: string;
  /** one-to-many: поле зворотної relation на дочірній entity (`(session) => session.device`). */
  inverse?: (entity: any) => unknown;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface IndexMeta {
  fields: string[];
  unique: boolean;
  name?: string;
}

export interface EntityMeta {
  target: Type<unknown>;
  table: string;
  columns: ColumnMeta[];
  relations: RelationMeta[];
  indexes: IndexMeta[];
}
