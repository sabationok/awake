import { safeNextPath } from './safe-next';

/**
 * Реєстр потоків `/redirects?type=…&action=…` і мапа «крок → сторінка». Агент дає лише крок (у QR чи в `next`
 * відповіді), а сторінку вибирає веб. Чиста функція: її викликає і серверний роут (Vercel), і клієнтська
 * сторінка статичної збірки (local).
 */
export const REDIRECT_TYPES = ['auth', 'pair', 'oauth'] as const;

export type RedirectStep = 'login' | 'pair' | 'dashboard';
/** Крок → сторінка. Одна мапа на обидві збірки. Усі сторінки — під префіксом `/app`, API — під `/api`. */
export const APP_PREFIX = '/app';
export const STEP_PATH: Record<RedirectStep, string> = { login: `${APP_PREFIX}/login`, pair: `${APP_PREFIX}/pair`, dashboard: APP_PREFIX };

export type RedirectResult = { ok: true; step: RedirectStep; params: Record<string, string> } | { ok: false; error: string; status: number };

const CODE = /^[A-Za-z0-9_-]{8,128}$/;

export function resolveRedirect(query: URLSearchParams): RedirectResult {
  const type = query.get('type') ?? '';
  const action = query.get('action') ?? '';
  if (!(REDIRECT_TYPES as readonly string[]).includes(type)) return { ok: false, error: 'UNKNOWN_TYPE', status: 400 };

  if (type === 'auth' && action === 'login') {
    return { ok: true, step: 'login', params: { next: safeNextPath(query.get('next')) } };
  }
  if (type === 'pair' && action === 'request') {
    const code = query.get('code') ?? '';
    if (!CODE.test(code)) return { ok: false, error: 'BAD_CODE', status: 400 };
    return { ok: true, step: 'pair', params: { code } };
  }
  if (type === 'oauth') return { ok: false, error: 'OAUTH_NOT_CONFIGURED', status: 501 };
  return { ok: false, error: 'UNKNOWN_ACTION', status: 400 };
}
