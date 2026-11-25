// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite

/** `"name"` з подвоєними лапками всередині. Імена беруться з метаданих, але лапки ставимо завжди. */
export const quoteIdentifier = (name: string) => `"${name.replace(/"/g, '""')}"`;
