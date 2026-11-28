import { uiKeys, type UiAlive, type UiNamespace, type UiShell } from '@macontrol/contracts';
import { NextResponse } from 'next/server';
import type { ShellResponse } from '@/demo/layout-response';
import { readFirst, readStageConfig } from '@/server/stage-config.vercel';
import { upstashGet } from '@/server/upstash.vercel';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** Пульс агента: ключі в Upstash не протухають одразу, тож онлайн чи ні каже окремий ключ. */
async function agentPulse(ns: UiNamespace): Promise<NonNullable<ShellResponse['agent']>> {
  const raw = await upstashGet(uiKeys(ns).alive);
  if (!raw) return { status: 'offline', at: null };
  const alive = JSON.parse(raw) as UiAlive;
  return { status: alive.every === null ? 'unknown' : 'online', at: alive.at };
}

/**
 * Індекс роутів з Upstash (`macontrol:<простір>:ui:shell`, перший простір, де він є) і пульс агента з того самого простору. Без ETag: пульс міняється щоразу, а індекс малий.
 * Немає джерела або ключа — `shell: null` з причиною; вигаданого інтерфейсу немає.
 */
export async function GET(): Promise<NextResponse<ShellResponse>> {
  const { stage, namespaces, unavailable } = readStageConfig();
  if (unavailable) return NextResponse.json({ shell: null, stage, reason: unavailable }, { headers: NO_STORE });
  try {
    const found = await readFirst(namespaces, (keys) => keys.shell);
    if (!found) return NextResponse.json({ shell: null, stage, reason: 'агент ще не опублікував інтерфейс' }, { headers: NO_STORE });
    const agent = await agentPulse(found.ns).catch(() => undefined);
    return NextResponse.json({ shell: JSON.parse(found.raw) as UiShell, stage, reason: null, agent }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ shell: null, stage, reason: (error as Error).message }, { headers: NO_STORE });
  }
}
