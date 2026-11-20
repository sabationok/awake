import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, isValidSession } from './server/session-cookie';

/** Усе, крім входу і статики, лише з дійсною кукою. */
export async function middleware(req: NextRequest) {
  if (await isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: ['/((?!login|_next/|manifest.webmanifest|icon-|icon\.svg|apple-touch-icon|favicon).*)'],
};
