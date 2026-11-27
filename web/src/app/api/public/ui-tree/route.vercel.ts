import { UI_TREE_KEY, type UiTree } from '@awake/contracts';
import { NextResponse } from 'next/server';
import { isUpstashConfigured, upstashCommand } from '@/server/upstash';

export const dynamic = 'force-dynamic';

/**
 * TEMP: публічне дерево UI для preview-збірок Umbra (web-umbra), поки в них немає своїх ключів Upstash.
 * Без входу, лише читання. `app.local` (адреса Mac і код сполучення) не віддається: керування тут немає.
 * Прибрати, коли Umbra читатиме Upstash сама в усіх stage.
 */
export async function GET() {
  const headers = { 'cache-control': 'no-store', 'access-control-allow-origin': '*' };
  if (!isUpstashConfigured()) return NextResponse.json({ tree: null, reason: 'Upstash не налаштовано' }, { status: 503, headers });
  const raw = await upstashCommand<string | null>(['GET', UI_TREE_KEY]);
  if (!raw) return NextResponse.json({ tree: null, reason: 'Агент ще не опублікував дерево' }, { status: 404, headers });
  const tree = JSON.parse(raw) as UiTree;
  return NextResponse.json({ tree: { ...tree, app: { ...tree.app, local: null } } satisfies UiTree }, { headers });
}
