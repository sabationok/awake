'use server';
import { cookies } from 'next/headers';
import { RELAY_DEVICE_COOKIE, UI_TREE_KEY, type UiTree } from '@awake/contracts';
import { SESSION_COOKIE, isValidSession } from './session-cookie';
import { isPreviewStage } from './stage';
import { isUpstashConfigured, upstashCommand } from './upstash';

/** Дерево UI для Web UI на Vercel. Лише читання: кнопки працюють у Web UI самого Mac. */
export async function getUiTree(): Promise<{ tree: UiTree | null; authorized: boolean; device?: boolean }> {
  const jar = await cookies();
  // Пристрій без пароля: Upstash йому не видаємо (перевірити кукі може лише Mac), дерево прийде через relay.
  if (!(await isValidSession(jar.get(SESSION_COOKIE)?.value))) return { tree: null, authorized: false, device: jar.has(RELAY_DEVICE_COOKIE) };
  if (!isUpstashConfigured()) return { tree: null, authorized: true };
  const raw = await upstashCommand<string | null>(['GET', UI_TREE_KEY]);
  const tree = raw ? (JSON.parse(raw) as UiTree) : null;
  // Без app.local браузер не піде до агента напряму: у preview лише перегляд дерева з Upstash.
  if (tree && isPreviewStage()) delete tree.app.local;
  return { tree, authorized: true };
}
