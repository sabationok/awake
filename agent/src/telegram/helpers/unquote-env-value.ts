/** Значення з .env у лапках ' або " віддає без лапок. */
export function unquoteEnvValue(raw: string): string {
  const quote = raw[0];
  if (raw.length >= 2 && (quote === "'" || quote === '"') && raw.endsWith(quote)) {
    return raw.slice(1, -1);
  }
  return raw;
}
