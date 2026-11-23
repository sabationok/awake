/**
 * Підписана кука входу в Web UI: `<lastActiveSec>.<idleMinutes>.<hmac>`.
 * Сесія ковзна: `lastActiveSec` оновлює middleware і дія активності, тож після `idleMinutes` без дій вхід гасне.
 * Web Crypto, тож працює і в middleware. Секрет — SESSION_SECRET, пароль — DASHBOARD_PASSWORD (обидва в env Vercel).
 * Зміна SESSION_SECRET відкликає всі видані сесії.
 */
export const SESSION_COOKIE = 'awake_session';
/** Не секрет: клієнт читає її, щоб знати, коли розлогінити вкладку після бездіяльності. */
export const IDLE_COOKIE = 'awake_idle';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const IDLE_OPTIONS_MINUTES = [2, 5, 10] as const;
export type IdleMinutes = (typeof IDLE_OPTIONS_MINUTES)[number];
export const DEFAULT_IDLE_MINUTES: IdleMinutes = 5;

const encoder = new TextEncoder();

async function hmac(value: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  // Без Buffer: middleware працює в edge-середовищі.
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Порівняння без раннього виходу, щоб час відповіді не підказував підпис. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function parseIdleMinutes(value: unknown): IdleMinutes {
  const n = Number(value);
  return (IDLE_OPTIONS_MINUTES as readonly number[]).includes(n) ? (n as IdleMinutes) : DEFAULT_IDLE_MINUTES;
}

/** Нова сесія або продовження: позначка активності «зараз» і обрана бездіяльність. */
export async function createSessionValue(idleMinutes: IdleMinutes = DEFAULT_IDLE_MINUTES): Promise<string> {
  const payload = `${Math.floor(Date.now() / 1000)}.${idleMinutes}`;
  return `${payload}.${await hmac(payload)}`;
}

/** Та сама сесія з оновленою активністю; null — сесія недійсна або вже прострочена. */
export async function touchSessionValue(value: string | undefined): Promise<string | null> {
  const parsed = await parseSession(value);
  return parsed ? createSessionValue(parsed.idleMinutes) : null;
}

async function parseSession(value: string | undefined): Promise<{ idleMinutes: IdleMinutes } | null> {
  if (!value) return null;
  const [lastActive, idle, signature] = value.split('.');
  if (!lastActive || !idle || !signature) return null;
  if (!safeEqual(signature, await hmac(`${lastActive}.${idle}`))) return null;
  const idleMinutes = parseIdleMinutes(idle);
  const idleExpired = Date.now() - Number(lastActive) * 1000 > idleMinutes * 60 * 1000;
  return idleExpired ? null : { idleMinutes };
}

export async function isValidSession(value: string | undefined): Promise<boolean> {
  return (await parseSession(value)) !== null;
}

/** Короткий пароль не приймаємо зовсім, щоб перебір був безнадійним. */
export const MIN_PASSWORD_LENGTH = 12;

export async function isValidPassword(password: string): Promise<boolean> {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected || expected.length < MIN_PASSWORD_LENGTH) return false;
  // Хешуємо обидва, щоб порівнювати рядки однакової довжини.
  const [a, b] = await Promise.all([hmac(`pw:${password}`), hmac(`pw:${expected}`)]);
  return safeEqual(a, b);
}
