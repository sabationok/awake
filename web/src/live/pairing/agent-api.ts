import type { AppNextStep, AppResponse } from '@macontrol/contracts';

/** Помилка API агента: код, HTTP-статус і, якщо агент його дав, наступний крок. */
export type AgentError = Error & { code?: string; status: number; next?: AppNextStep };

/** Відповідь з ETag: `tag` — що слати в `If-None-Match` наступного разу. */
export interface Tagged<T> {
  tag: string | null;
  data: T;
}

/**
 * Запит до API агента: успіх — data, помилка — виняток з кодом і HTTP-статусом.
 * base — адреса агента, якщо він на іншому origin (прямий доступ з Vercel); порожній — той самий сайт.
 * Без token на тому ж сайті браузер шле HttpOnly-кукі `mc_*` сам (Tailscale).
 */
export async function callAgent<T>(path: string, token: string | null, init: RequestInit = {}, base = ''): Promise<T> {
  return parse<T>(await request(path, token, init, base));
}

/**
 * GET з `If-None-Match`: `null` — `304`, у клієнта вже та сама версія; інакше дані і новий ETag. Тег ставимо самі,
 * щоб `304` дійшов до коду, а не підмінився кешем браузера: так незмінна сторінка не перемальовується.
 */
export async function callAgentTagged<T>(path: string, token: string | null, tag: string | null): Promise<Tagged<T> | null> {
  const res = await request(path, token, tag ? { headers: { 'If-None-Match': tag } } : {}, '');
  if (res.status === 304) return null;
  return { tag: res.headers.get('ETag'), data: await parse<T>(res) };
}

function request(path: string, token: string | null, init: RequestInit, base: string) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${base}${path}`, { ...init, headers });
}

async function parse<T>(res: Response): Promise<T> {
  // Не JSON (агента нема, а відповів хтось інший, або обірвалось з'єднання) — це «сервер недоступний», не збій парсера.
  const body = (await res.json().catch(() => null)) as AppResponse<T> | null;
  if (!body) throw Object.assign(new Error('Сервер недоступний'), { status: res.status }) as AgentError;
  if (!body.ok) throw Object.assign(new Error(body.error?.message ?? res.statusText), { code: body.error?.code, status: res.status, next: body.next }) as AgentError;
  return body.data as T;
}
