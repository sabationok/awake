import { UI_ALIVE_KEY, UI_TREE_KEY, type UiAlive, type UiTree } from '@awake/contracts';
import { NextResponse } from 'next/server';
import { FIXTURE_SAMPLED_AT, fixtureTree } from '@/fixtures/tree';
import { toPublicUiTree } from '@/server/public-tree.vercel';
import type { TreeResponse } from '@/demo/tree-response';
import { readStageConfig, type TreeSource } from '@/server/stage-config.vercel';
import { upstashGet } from '@/server/upstash.vercel';

export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 4000;

async function fromSource(source: TreeSource): Promise<UiTree | string> {
  if (source.kind === 'upstash') {
    const raw = await upstashGet(UI_TREE_KEY);
    return raw ? (JSON.parse(raw) as UiTree) : 'агент ще не опублікував дерево';
  }
  const headers: Record<string, string> = {};
  // Web Swift на Vercel закритий Vercel Authentication; секрет обходу, якщо його видано.
  if (process.env.TREE_SOURCE_BYPASS) headers['x-vercel-protection-bypass'] = process.env.TREE_SOURCE_BYPASS;
  const res = await fetch(source.url, { cache: 'no-store', headers, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status >= 300 && res.status < 400) return 'закритий Vercel Authentication';
  const body = (await res.json().catch(() => null)) as { tree?: UiTree | null; reason?: string } | null;
  return body?.tree ?? body?.reason ?? `відповів ${res.status}`;
}

/** Пульс агента: дерево в Upstash не протухає само, тож онлайн чи ні каже окремий ключ. */
async function agentPulse(): Promise<NonNullable<TreeResponse['agent']>> {
  const raw = await upstashGet(UI_ALIVE_KEY);
  if (!raw) return { status: 'offline', at: null };
  const alive = JSON.parse(raw) as UiAlive;
  return { status: alive.every === null ? 'unknown' : 'online', at: alive.at };
}

/** Джерела по черзі (Upstash → Web Swift), а коли жодне не дало дерева — вбудовані фікстури. Браузер сам нічого не підміняє. */
export async function GET(): Promise<NextResponse<TreeResponse>> {
  const { stage, sources } = readStageConfig();
  const misses: TreeResponse['misses'] = [];
  for (const source of sources) {
    try {
      const tree = await fromSource(source);
      if (typeof tree !== 'string') {
        const agent = source.kind === 'upstash' ? await agentPulse().catch(() => undefined) : undefined;
        return NextResponse.json({ tree: toPublicUiTree(tree), origin: source.kind, stage, misses, agent }, { headers: { 'Cache-Control': 'no-store' } });
      }
      misses.push({ origin: source.kind, reason: tree });
    } catch (error) {
      misses.push({ origin: source.kind, reason: (error as Error).name === 'TimeoutError' ? 'не відповів вчасно' : (error as Error).message });
    }
  }
  return NextResponse.json(
    { tree: fixtureTree(), origin: 'fixtures', stage, misses, sampledAt: FIXTURE_SAMPLED_AT },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
