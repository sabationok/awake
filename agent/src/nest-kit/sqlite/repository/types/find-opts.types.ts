// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite

type Unwrap<T> = NonNullable<T> extends (infer U)[] ? U : NonNullable<T>;

/** Поля, що можуть бути relation (об'єкт чи масив об'єктів). Перевірку, що це справді relation, робить runtime. */
export type RelationKeysOf<E> = { [K in keyof E]-?: Unwrap<E[K]> extends object ? (Unwrap<E[K]> extends Date ? never : K) : never }[keyof E] & string;

/** `['device']` або вкладено `{ device: { webSessions: true } }`; глибина до 3. */
export type RelationsOf<E> = RelationKeysOf<E>[] | { [K in RelationKeysOf<E>]?: true | RelationsOf<Unwrap<E[K]>> };

export type SelectOf<E> = keyof E & string;

export type OrderDirection = 'ASC' | 'DESC';
export type OrderOf<E> = { [K in keyof E & string]?: OrderDirection };

/** Усе, що не є фільтром домену: один тип для всіх методів читання. */
export interface SqliteFindOpts<E> {
  /** Поля кореня; первинний ключ додається завжди. */
  select?: SelectOf<E>[];
  relations?: RelationsOf<E>;
  order?: OrderOf<E>;
  /** Разом із soft-deleted. */
  withDeleted?: boolean;
  /** Лише soft-deleted (кошик). */
  onlyDeleted?: boolean;
}

export interface SqliteUpsertOpts<E> {
  /** Поля унікального ключа (`ON CONFLICT (...)`). */
  conflict: (keyof E & string)[];
  /** Що оновити при конфлікті; без нього — `DO NOTHING`. */
  update?: (keyof E & string)[];
}

export type DeletedMode = 'exclude' | 'with' | 'only';
