import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, isValidSession } from './server/session-cookie';

/** Усе, крім входу і статики, лише з дійсною кукою. Для /api — 401 замість редиректу. */
export async function middleware(req: NextRequest) {
  if (await isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api/')) return NextResponse.json(null, { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: ['/((?!login|_next/|manifest.webmanifest|icon-|apple-touch-icon|favicon).*)'],
};
