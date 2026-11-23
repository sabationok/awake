import { NextResponse, type NextRequest } from 'next/server';
import { STEP_PATH, resolveRedirect } from '@/features/redirects/redirect-flows';

/**
 * `/redirects?type=…&action=…`: рішення про перехід приймає сервер, браузер лише отримує 302.
 * Секрети (токени, куки) сюди можна ставити на цій відповіді, клієнт їх не бачить у тілі.
 */
export function GET(req: NextRequest) {
  const result = resolveRedirect(req.nextUrl.searchParams);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status, headers: { 'cache-control': 'no-store' } });
  const url = new URL(STEP_PATH[result.step], req.nextUrl.origin);
  for (const [key, value] of Object.entries(result.params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, { headers: { 'cache-control': 'no-store' } });
}

export const dynamic = 'force-dynamic';
