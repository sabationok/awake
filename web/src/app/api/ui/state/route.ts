import type { StateFull } from '@macontrol/contracts';
import { NextResponse, type NextRequest } from 'next/server';
import { readFirst, readStageConfig } from '@/server/stage-config.vercel';

export const dynamic = 'force-dynamic';

/**
 * AppState з Upstash (`macontrol:<простір>:ui:state`, scope all — агент уже відфільтрував локальні гілки). ETag
 * `"all:<простір>:state:<rev>"` і `private, no-cache`: той самий `rev` — `304`. Немає ключа — `404`, вузли
 * малюються як прийшли.
 */
export async function GET(request: NextRequest) {
  const { namespaces, unavailable } = readStageConfig();
  if (unavailable) return NextResponse.json({ reason: unavailable }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const found = await readFirst(namespaces, (keys) => keys.state);
  if (!found) return NextResponse.json({ reason: 'стейту немає' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const full = JSON.parse(found.raw) as StateFull;
  const etag = `"all:${found.ns}:state:${full.rev}"`;
  const headers = { ETag: etag, 'Cache-Control': 'private, no-cache' };
  if (request.headers.get('if-none-match') === etag) return new NextResponse(null, { status: 304, headers });
  return NextResponse.json(full, { headers });
}
