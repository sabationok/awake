import { NextResponse, type NextRequest } from 'next/server';
import { RELAY_COOKIE_PREFIX } from '@awake/contracts';
import { readStageConfig } from '@/server/stage-config';
import { isPreviewStage } from '@/server/stage';
import { SESSION_COOKIE, isValidSession } from '@/server/session-cookie';

/** Сегмент шляху до Mac: лише безпечні символи, без `..` і кодованих слешів. */
const SEGMENT = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_SEGMENTS = 4;
const MAX_BODY_BYTES = 16 * 1024;

/**
 * Тупий проксі до Mac через webhooxy `relay:request` (docs/relay-contract.md → «Авторизація пристрою»).
 * URL upstream і `X-Relay-Key` беруться з env цього stage, ніколи від клієнта. В upstream ідуть лише кукі `mc_*`:
 * сесія Web UI в webhooxy не потрапляє. Що робити із запитом, вирішує Mac.
 */
async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // Preview stage не ходить до агента зовсім.
  if (isPreviewStage()) return error(503, 'PREVIEW_STAGE');
  const { path } = await params;
  if (path.length > MAX_SEGMENTS || !path.every((segment) => SEGMENT.test(segment))) return error(404, 'NOT_FOUND');
  // Запит з чужого сайту: браузер шле Origin, і він має збігатися з нашим.
  const origin = req.headers.get('origin');
  if (req.method !== 'GET' && origin && origin !== req.nextUrl.origin) return error(403, 'FORBIDDEN');

  // Квиток viewer-а Mac видає лише після входу: довіра пристрою сама по собі не відкриває relay.
  if (path[0] === 'connect' && !(await isValidSession(req.cookies.get(SESSION_COOKIE)?.value))) return error(401, 'AUTH_REQUIRED');

  const { webhooxyUrl } = readStageConfig();
  const key = process.env.WEBHOOXY_RELAY_REQUEST_KEY;
  const room = process.env.WEBHOOXY_ROOM;
  const workspace = process.env.WEBHOOXY_WORKSPACE;
  if (!webhooxyUrl || !key || !room || !workspace) return error(503, 'RELAY_UNCONFIGURED');

  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text();
  if (body && body.length > MAX_BODY_BYTES) return error(413, 'PAYLOAD_TOO_LARGE');

  const upstream = new URL(`/api/relay/rooms/${encodeURIComponent(room)}/request/${path.join('/')}`, webhooxyUrl);
  upstream.searchParams.set('mt_workspace', workspace);
  const headers = new Headers({ 'X-Relay-Key': key });
  for (const name of ['content-type', 'accept', 'user-agent']) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  const cookie = req.cookies
    .getAll()
    .filter(({ name }) => name.startsWith(RELAY_COOKIE_PREFIX))
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
  if (cookie) headers.set('cookie', cookie);

  let res: Response;
  try {
    res = await fetch(upstream, { method: req.method, headers, body, cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  } catch {
    return error(502, 'RELAY_UNREACHABLE');
  }

  const text = await res.text();
  // Відмова самого webhooxy (HOST_OFFLINE, TIMEOUT…) має інший конверт: перекладаємо в AppResponse.
  const relayError = res.ok ? null : readRelayError(text);
  if (relayError) return error(res.status, relayError);
  const out = new NextResponse(text, { status: res.status });
  out.headers.set('content-type', res.headers.get('content-type') ?? 'application/json');
  out.headers.set('cache-control', 'no-store');
  // Кілька Set-Cookie — окремими заголовками, інакше вони зіллються через кому.
  for (const setCookie of res.headers.getSetCookie()) out.headers.append('set-cookie', setCookie);
  return out;
}

/** Код помилки webhooxy `{ message, statusCode, innerCode }`; null — це відповідь Mac (AppResponse) або не JSON. */
function readRelayError(text: string): string | null {
  try {
    const body = JSON.parse(text) as { ok?: unknown; innerCode?: unknown };
    return 'ok' in body || typeof body.innerCode !== 'string' ? null : body.innerCode;
  } catch {
    return null;
  }
}

/** Помилка в конверті агента (AppResponse), щоб callAgent на клієнті читав її так само. */
function error(status: number, code: string) {
  return NextResponse.json({ ok: false, error: { code, message: code } }, { status, headers: { 'cache-control': 'no-store' } });
}

export const GET = proxy;
export const POST = proxy;
export const dynamic = 'force-dynamic';
