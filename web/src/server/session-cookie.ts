/**
 * Підписана кука входу в дашборд: `<expiresAt>.<hmac>`. Web Crypto, тож працює і в middleware.
 * Секрет — SESSION_SECRET, пароль — DASHBOARD_PASSWORD (обидва в env Vercel).
 */
export const SESSION_COOKIE = 'awake_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

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

export async function createSessionValue(): Promise<string> {
  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS);
  return `${expiresAt}.${await hmac(expiresAt)}`;
}

export async function isValidSession(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [expiresAt, signature] = value.split('.');
  if (!expiresAt || !signature || Number(expiresAt) * 1000 < Date.now()) return false;
  return safeEqual(signature, await hmac(expiresAt));
}

export async function isValidPassword(password: string): Promise<boolean> {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false;
  // Хешуємо обидва, щоб порівнювати рядки однакової довжини.
  const [a, b] = await Promise.all([hmac(`pw:${password}`), hmac(`pw:${expected}`)]);
  return safeEqual(a, b);
}
