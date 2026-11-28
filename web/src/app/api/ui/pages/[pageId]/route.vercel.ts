import { uiPageKey, type UiPageLayout } from '@awake/contracts';
import { NextResponse, type NextRequest } from 'next/server';
import { toPublicLayout } from '@/server/public-layout.vercel';
import { readStageConfig } from '@/server/stage-config.vercel';
import { upstashGet } from '@/server/upstash.vercel';

export const dynamic = 'force-dynamic';

/**
 * Одна сторінка з Upstash (`macontrol:ui:page:<id>`), без QR і `copy`. ETag `"all:<rev>"` і `private, no-cache`:
 * браузер щоразу звіряється, той самий `rev` — `304` без тіла. Немає сторінки — `404`.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const { unavailable } = readStageConfig();
  if (unavailable) return NextResponse.json({ reason: unavailable }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const raw = await upstashGet(uiPageKey(pageId));
  if (!raw) return NextResponse.json({ reason: 'сторінки немає' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const page = JSON.parse(raw) as UiPageLayout;
  const etag = `"all:${page.rev}"`;
  const headers = { ETag: etag, 'Cache-Control': 'private, no-cache' };
  if (request.headers.get('if-none-match') === etag) return new NextResponse(null, { status: 304, headers });
  return NextResponse.json(toPublicLayout(page), { headers });
}
