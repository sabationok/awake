import { NextResponse } from 'next/server';
import { readPresence } from '@/server/presence';

export const dynamic = 'force-dynamic';

/** Доступ перевіряє middleware: без куки сюди не дійти. */
export async function GET() {
  return NextResponse.json(await readPresence(), { headers: { 'Cache-Control': 'no-store' } });
}
