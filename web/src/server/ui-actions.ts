'use server';
import { cookies } from 'next/headers';
import { UI_TREE_KEY, type UiTree } from '@awake/contracts';
import { SESSION_COOKIE, isValidSession } from './session-cookie';
import { isUpstashConfigured, upstashCommand } from './upstash';

/** Дерево UI для дашборду на Vercel. Лише читання: кнопки працюють на пульті самого Mac. */
export async function getUiTree(): Promise<{ tree: UiTree | null; authorized: boolean }> {
  if (!(await isValidSession((await cookies()).get(SESSION_COOKIE)?.value))) return { tree: null, authorized: false };
  if (!isUpstashConfigured()) return { tree: null, authorized: true };
  const raw = await upstashCommand<string | null>(['GET', UI_TREE_KEY]);
  return { tree: raw ? (JSON.parse(raw) as UiTree) : null, authorized: true };
}
