import type { AppResponse } from '@awake/contracts';

/** Запит до API агента: успіх — data, помилка — виняток з кодом. */
export async function callAgent<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const body = (await res.json()) as AppResponse<T>;
  if (!body.ok) throw Object.assign(new Error(body.error?.message ?? res.statusText), { code: body.error?.code });
  return body.data as T;
}
