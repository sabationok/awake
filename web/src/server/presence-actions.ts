'use server';
import { cookies } from 'next/headers';
import type { Presence } from '@awake/contracts';
import { readPresence } from './presence';
import { SESSION_COOKIE, isValidSession } from './session-cookie';

/** Опитування стану з дашборду. Кука перевіряється і тут, не лише в middleware. */
export async function getPresence(): Promise<{ presence: Presence | null; authorized: boolean }> {
  if (!(await isValidSession((await cookies()).get(SESSION_COOKIE)?.value))) return { presence: null, authorized: false };
  return { presence: await readPresence(), authorized: true };
}
