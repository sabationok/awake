import { UI_TREE_KEY, type UiTree } from '@awake/contracts';
import { NextResponse } from 'next/server';
import { readStageConfig } from '@/server/stage-config';
import { isUpstashConfigured, upstashGet } from '@/server/upstash';

export const dynamic = 'force-dynamic';

export type TreeResponse = { source: 'live'; tree: UiTree } | { source: 'none'; reason: string };

/** Дерево з Upstash (dev / production з ключами) або з публічного роуту старого Web UI (preview і поки ключів нема, TEMP). */
async function readTree(): Promise<UiTree | string> {
  const { tree } = readStageConfig();
  if (tree.kind === 'web') {
    const headers: Record<string, string> = {};
    // Preview старого Web UI закритий Vercel Authentication; секрет обходу, якщо його видано.
    if (process.env.TREE_SOURCE_BYPASS) headers['x-vercel-protection-bypass'] = process.env.TREE_SOURCE_BYPASS;
    const res = await fetch(tree.url, { cache: 'no-store', headers, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) return 'Старий Web UI закритий Vercel Authentication';
    const body = (await res.json().catch(() => null)) as { tree?: UiTree | null; reason?: string } | null;
    return body?.tree ?? body?.reason ?? `Старий Web UI ${res.status}`;
  }
  if (!isUpstashConfigured()) return 'Upstash не налаштовано';
  const raw = await upstashGet(UI_TREE_KEY);
  return raw ? (JSON.parse(raw) as UiTree) : 'Агент ще не опублікував дерево';
}

/** `app.local` (адреса Mac і код сполучення) не йде в браузер: Umbra нічого не надсилає агенту. */
export async function GET(): Promise<NextResponse<TreeResponse>> {
  try {
    const tree = await readTree();
    if (typeof tree === 'string') return NextResponse.json({ source: 'none', reason: tree });
    return NextResponse.json({ source: 'live', tree: { ...tree, app: { ...tree.app, local: null } } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ source: 'none', reason: (error as Error).message });
  }
}
