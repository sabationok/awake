import { Inject, Injectable, Logger } from '@nestjs/common';
import { RELAY_DEVICE_COOKIE, type AppResponse, type RelayPairPoll, type RelayViewerAccess } from '@awake/contracts';
import { AGENT_CONFIG, type AgentConfig } from '../../../config/agent-config';
import { PairingService } from '../../../devices/services/pairing.service';
import { deviceViewerSub } from '../../helpers/device-viewer-sub';
import { signViewerTicket } from '../../helpers/sign-viewer-ticket';
import type { RelayEnv } from '../../types/relay-env.types';
import { readCookie } from '../../../common/read-cookie';
import type { RelayHttpRequest, RelayHttpResponse } from './types/relay-request.types';

/** Браузери не тримають кукі довше 400 днів; пристрій живе, доки його не відкличуть на Mac. */
const DEVICE_COOKIE_MAX_AGE_S = 400 * 24 * 60 * 60;
const POLL_PATH = /^\/pair\/([A-Za-z0-9_-]{1,64})$/;

/**
 * HTTP-тунель `relay:request`: Web UI на Vercel (тупий проксі `/api/mac/*`) через webhooxy питає Mac.
 * Шар 1 — пристрій: дистанційне сполучення за кодом з QR, токен пристрою лягає в HttpOnly-кукі `mc_device`.
 * Шар 2 — квиток: `POST /connect` з цією кукі дає підписаний Mac квиток на сокет relay (docs/relay-contract.md).
 * Усе, крім `meta`, прийшло від браузера без перевірки: відповідаємо лише кодами, винятків назовні не кидаємо.
 */
@Injectable()
export class RelayRequestService {
  private readonly _logger = new Logger(RelayRequestService.name);

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _pairing: PairingService,
  ) {}

  handle(request: RelayHttpRequest | undefined, env: RelayEnv): RelayHttpResponse {
    if (!request || typeof request.path !== 'string' || typeof request.method !== 'string') return fail(400, 'BAD_REQUEST');
    const method = request.method.toUpperCase();
    const path = request.path.replace(/\/+$/, '') || '/';
    if (method === 'POST' && path === '/pair') return this._pair(request);
    const poll = POLL_PATH.exec(path);
    if (method === 'GET' && poll) return this._poll(poll[1]);
    if (method === 'POST' && path === '/connect') return this._connect(request, env);
    return fail(404, 'NOT_FOUND');
  }

  /** Код із дистанційного QR → запит «Це ви?» на Mac. Локальний код тут не приймається. */
  private _pair(request: RelayHttpRequest): RelayHttpResponse {
    const code = (request.body as { code?: unknown } | null)?.code;
    if (typeof code !== 'string' || code.length > 64) return fail(400, 'BAD_REQUEST');
    const requestId = this._pairing.request(code, header(request, 'user-agent'), 'remote');
    if (!requestId) return fail(401, 'UNAUTHORIZED', 'Pairing code expired or invalid');
    return ok({ requestId });
  }

  /** Пристрій чекає «Дозволити». Токен іде лише в HttpOnly-кукі: JS сторінки його не бачить. */
  private _poll(requestId: string): RelayHttpResponse {
    const result = this._pairing.poll(requestId);
    const body = ok<RelayPairPoll>({ status: result.status });
    if (result.status !== 'approved') return body;
    return { ...body, cookies: [{ name: RELAY_DEVICE_COOKIE, value: result.token, maxAge: DEVICE_COOKIE_MAX_AGE_S, httpOnly: true, sameSite: 'lax' }] };
  }

  /** Кукі пристрою → свіжий квиток viewer-а (≤ 300 с, одноразовий) з `sub = device:<id>`. */
  private _connect(request: RelayHttpRequest, env: RelayEnv): RelayHttpResponse {
    const token = readCookie(header(request, 'cookie') ?? undefined, RELAY_DEVICE_COOKIE);
    const deviceId = token ? this._pairing.findDeviceId(token, 'remote') : null;
    if (deviceId === null) return fail(401, 'UNAUTHORIZED', 'Device is not paired');
    if (!this._config.webhooxyUrl) return fail(503, 'RELAY_UNCONFIGURED');
    this._logger.log(`Relay ticket for device ${deviceId}`);
    return ok<RelayViewerAccess>({
      url: this._config.webhooxyUrl,
      room: env.room,
      workspace: env.workspace,
      token: signViewerTicket(env.ticketKey, env.room, deviceViewerSub(deviceId)),
    });
  }
}

function header(request: RelayHttpRequest, name: string): string | null {
  const value = request.headers?.[name];
  return typeof value === 'string' ? value : null;
}

function ok<T>(data: T): RelayHttpResponse {
  return { statusCode: 200, body: { ok: true, data } satisfies AppResponse<T> };
}

function fail(statusCode: number, code: string, message = code): RelayHttpResponse {
  return { statusCode, body: { ok: false, error: { code, message } } satisfies AppResponse<never> };
}
