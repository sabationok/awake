import { NextResponse, type NextRequest } from 'next/server';
import { resolveRedirect } from '@/features/redirects/redirect-flows';

/** Сервер відповідає, який крок далі. Клієнт сам мапить крок на сторінку. */
export function GET(req: NextRequest) {
  const result = resolveRedirect(req.nextUrl.searchParams);
  const headers = { 'cache-control': 'no-store' };
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status, headers });
  return NextResponse.json({ ok: true, step: result.step, params: result.params }, { headers });
}

export const dynamic = 'force-dynamic';
