import { NextResponse, type NextRequest } from 'next/server';
import { RELAY_DEVICE_COOKIE } from '@awake/contracts';
import { SESSION_COOKIE, isValidSession } from './server/session-cookie';

/**
 * Усе, крім входу, сполучення, проксі до Mac і статики, — з дійсною сесією або кукі пристрою.
 * Кукі пристрою тут перевірити нема чим (лише Mac знає хеш), тож вона пускає лише на оболонку сторінки:
 * дані пристрій отримує тільки через `/api/mac/connect`, де її перевіряє Mac.
 */
export async function middleware(req: NextRequest) {
  if (await isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (req.cookies.has(RELAY_DEVICE_COOKIE)) return NextResponse.next();
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: ['/((?!login|pair|api/mac/|_next/|manifest.webmanifest|icon-|icon\.svg|apple-touch-icon|favicon).*)'],
};
