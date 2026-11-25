// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite

const PRAGMA_VALUE = /^(?:-?\d+|[A-Za-z_][A-Za-z0-9_]*)$/;

/** Значення pragma — число або слово (`WAL`, `ON`, `-2000`); більше нічого в `PRAGMA x = …` не йде. */
export function assertPragmaValue(name: string, value: string | number): string {
  const text = String(value);
  if (!PRAGMA_VALUE.test(text)) throw new Error(`Invalid value for pragma ${name}: ${text}`);
  return text;
}
