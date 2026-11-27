/** Фіктивний origin: шлях розбирається як URL, і все, що втекло з нього (`//host`, `/\host`, протокол), відкидається. */
const BASE = 'http://local.invalid';
/** Браузер вирізає з URL таби й переводи рядка: `/\t/evil.com` став би `//evil.com`. */
const CONTROL_OR_SPACE = /[\u0000-\u001F\u007F\s]/;

/** Лише внутрішній шлях: без чужого origin, без керівних символів, щоб не відправити користувача на чужий сайт. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || CONTROL_OR_SPACE.test(value)) return '/app';
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return '/app';
    // Нормалізація може сама зібрати `//`: `/.//evil.com` → pathname `//evil.com`. Перевіряємо те, що віддаємо.
    const out = `${url.pathname}${url.search}${url.hash}`;
    return /^\/[\/\\]/.test(out) || new URL(out, BASE).origin !== BASE ? '/app' : out;
  } catch {
    return '/app';
  }
}
