import type { CookieOptions, Response } from 'express';
import { RELAY_DEVICE_COOKIE, WEB_SESSION_COOKIE } from '@awake/contracts';
import { DEVICE_COOKIE_MAX_AGE_MS } from '../constants/web-auth';

/** Same-origin через `https://<mac>.ts.net`: TLS знімає serve, браузер бачить https, тож Secure працює. */
const BASE: CookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };

export function setDeviceCookie(res: Response, token: string) {
  res.cookie(RELAY_DEVICE_COOKIE, token, { ...BASE, maxAge: DEVICE_COOKIE_MAX_AGE_MS });
}

/** Без maxAge: кука до закриття браузера, а строк сесії веде агент. */
export function setSessionCookie(res: Response, token: string) {
  res.cookie(WEB_SESSION_COOKIE, token, BASE);
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(WEB_SESSION_COOKIE, BASE);
}
