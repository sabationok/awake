// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite

/** `limit` / `offset` списку. Голий `limit` у query-класі модуля не оголошується — лише через `HasPaginationQuery`. */
export class PaginationQuery {
  limit!: number;
  offset?: number;
}

export class HasPaginationQuery {
  pagination?: PaginationQuery;
}
