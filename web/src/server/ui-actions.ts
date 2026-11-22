'use server';
import { cookies } from 'next/headers';
import { RELAY_DEVICE_COOKIE, UI_TREE_KEY, type UiTree } from '@awake/contracts';
import { SESSION_COOKIE, isValidSession } from './session-cookie';
import { isUpstashConfigured, upstashCommand } from './upstash';

/** Дерево UI для дашборду на Vercel. Лише читання: кнопки працюють на пульті самого Mac. */
export async function getUiTree(): Promise<{ tree: UiTree | null; authorized: boolean; device?: boolean }> {
  const jar = await cookies();
  // Пристрій без пароля: Upstash йому не видаємо (перевірити кукі може лише Mac), дерево прийде через relay.
  if (!(await isValidSession(jar.get(SESSION_COOKIE)?.value))) return { tree: null, authorized: false, device: jar.has(RELAY_DEVICE_COOKIE) };
  if (!isUpstashConfigured()) return { tree: null, authorized: true };
  const raw = await upstashCommand<string | null>(['GET', UI_TREE_KEY]);
  return { tree: raw ? (JSON.parse(raw) as UiTree) : null, authorized: true };
}
