import type { AppNextStep, AppResponse } from '@awake/contracts';

/** Помилка API агента: код, HTTP-статус і, якщо агент його дав, наступний крок. */
export type AgentError = Error & { code?: string; status: number; next?: AppNextStep };

/**
 * Запит до API агента: успіх — data, помилка — виняток з кодом і HTTP-статусом.
 * base — адреса агента, якщо він на іншому origin (прямий доступ з Vercel); порожній — той самий сайт.
 * Без token на тому ж сайті браузер шле HttpOnly-кукі `mc_*` сам (Tailscale).
 */
export async function callAgent<T>(path: string, token: string | null, init: RequestInit = {}, base = ''): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  // Не JSON (агента нема, а відповів хтось інший, або обірвалось з'єднання) — це «сервер недоступний», не збій парсера.
  const body = (await res.json().catch(() => null)) as AppResponse<T> | null;
  if (!body) throw Object.assign(new Error('Сервер недоступний'), { status: res.status }) as AgentError;
  if (!body.ok) throw Object.assign(new Error(body.error?.message ?? res.statusText), { code: body.error?.code, status: res.status, next: body.next }) as AgentError;
  return body.data as T;
}
