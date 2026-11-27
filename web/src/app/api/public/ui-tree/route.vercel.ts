import { UI_TREE_KEY, type UiTree } from '@awake/contracts';
import { NextResponse } from 'next/server';
import { toPublicUiTree } from '@/server/public-tree';
import { isUpstashConfigured, upstashCommand } from '@/server/upstash';

export const dynamic = 'force-dynamic';

/**
 * TEMP: публічне дерево UI для Web Umbra, поки в неї немає своїх ключів Upstash. Без входу, лише читання.
 * Без CORS: Umbra бере його зі свого сервера, не з браузера. Сполучення, QR і значення `copy` вирізані.
 * Прибрати, коли Umbra читатиме Upstash сама в усіх stage.
 */
export async function GET() {
  const headers = { 'cache-control': 'no-store' };
  if (!isUpstashConfigured()) return NextResponse.json({ tree: null, reason: 'Upstash не налаштовано' }, { status: 503, headers });
  const raw = await upstashCommand<string | null>(['GET', UI_TREE_KEY]);
  if (!raw) return NextResponse.json({ tree: null, reason: 'Агент ще не опублікував дерево' }, { status: 404, headers });
  return NextResponse.json({ tree: toPublicUiTree(JSON.parse(raw) as UiTree) }, { headers });
}
