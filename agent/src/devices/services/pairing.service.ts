import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Subject } from 'rxjs';
import type { DevicePairingMode } from '@macontrol/contracts';
import type { CreateDeviceDto } from '../dto/create-device.dto';
import { DEVICE_PUBLIC_FIELDS } from '../constants/device-public-fields';
import { OwnerAuthService } from '../../mac-helper/services/owner-auth.service';
import { DevicesRepository } from '../repositories/devices.repository';
import type { PairingEvent } from '../types/pairing-event.types';

/** Код живе стільки, а попередній ще приймається один період, щоб не зламати щойно відкрите посилання. */
const CODE_TTL_MS = 2 * 60 * 1000;
/** Скільки запит на сполучення чекає відповіді на Mac. */
const REQUEST_TTL_MS = 2 * 60 * 1000;
/** Відповідь (дозволено / відхилено) пристрій має забрати за цей час. */
const ANSWER_TTL_MS = 60 * 1000;
/** Сполучений пристрій, якого не бачили довше, — знову «під'єднався» (подія `connected`). */
const RECONNECT_GAP_MS = 30 * 60 * 1000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export type PairingRequestStatus = 'pending' | 'approved' | 'denied' | 'expired';

/** Відповідь опитування; токен і пристрій — лише раз, при схваленні. */
export type PairingPollResult =
  | { status: Exclude<PairingRequestStatus, 'approved'> }
  | { status: 'approved'; token: string; deviceId: number; via: DevicePairingMode };

interface PairingCode {
  value: string;
  issuedAt: number;
  /** Код приймається лише тим шляхом, для якого його видали. */
  mode: DevicePairingMode;
}

interface PairingRequest {
  id: string;
  via: DevicePairingMode;
  userAgent: string | null;
  createdAt: number;
  status: 'pending' | 'approved' | 'denied';
  answeredAt?: number;
  /** Видається пристрою один раз, коли він забирає дозвіл. */
  token?: string;
  /** Пристрій, заведений при «Дозволити»: для першої вебсесії. */
  deviceId?: number;
}

/**
 * Сполучення як у месенджерах: пристрій відкриває посилання з QR (одноразовий код), агент заводить запит,
 * Mac-аппка питає «Це ви?», і лише після «Дозволити» пристрій отримує свій токен.
 * Код публікується в Upstash разом з адресою; токен пристрою не залишає браузер, у базі лише його хеш.
 */
@Injectable()
export class PairingService {
  private _codes: PairingCode[] = [];
  private _requests: PairingRequest[] = [];
  /** Змінився список пристроїв або запитів: Mac-аппці треба новий знімок. */
  readonly changed$ = new Subject<void>();
  /** Запити, відповіді й повторні входи пристроїв, з шляхом: з них модулі шляхів шлють сповіщення. */
  readonly events$ = new Subject<PairingEvent>();

  /** Таймер на шлях: коли код спливе, changed$ — сторінка «Пристрої» перебудується з новим QR. */
  private readonly _expiryTimers = new Map<DevicePairingMode, NodeJS.Timeout>();

  constructor(
    private readonly _devices: DevicesRepository,
    private readonly _ownerAuth: OwnerAuthService,
  ) {}

  /** Поточний код шляху і коли його перестануть видавати (ще один період його приймають). */
  currentCodeInfo(mode: DevicePairingMode): { value: string; expiresAt: number } {
    const now = Date.now();
    this._codes = this._codes.filter((code) => now - code.issuedAt < CODE_TTL_MS * 2);
    const latest = this._codes.filter((code) => code.mode === mode).at(-1);
    if (latest && now - latest.issuedAt < CODE_TTL_MS) return { value: latest.value, expiresAt: latest.issuedAt + CODE_TTL_MS };
    const code: PairingCode = { value: randomBytes(16).toString('base64url'), issuedAt: now, mode };
    this._codes.push(code);
    this._scheduleExpiry(mode);
    return { value: code.value, expiresAt: now + CODE_TTL_MS };
  }

  /** «Новий код» на Mac: усі видані коди перестають діяти, наступний знімок отримає нові. */
  resetCodes(): void {
    this._codes = [];
    for (const timer of this._expiryTimers.values()) clearTimeout(timer);
    this._expiryTimers.clear();
    this.changed$.next();
  }

  private _scheduleExpiry(mode: DevicePairingMode): void {
    if (this._expiryTimers.has(mode)) return;
    const timer = setTimeout(() => {
      this._expiryTimers.delete(mode);
      this.changed$.next();
    }, CODE_TTL_MS + 500);
    timer.unref();
    this._expiryTimers.set(mode, timer);
  }

  /** Міняє код на запит, що чекає підтвердження на Mac. Код після цього недійсний; чужого шляху код не приймається. */
  request(code: string, userAgent: string | null, via: DevicePairingMode): string | null {
    const now = Date.now();
    const given = Buffer.from(code);
    const match = this._codes.find(
      (candidate) =>
        candidate.mode === via &&
        now - candidate.issuedAt < CODE_TTL_MS * 2 &&
        candidate.value.length === code.length &&
        timingSafeEqual(Buffer.from(candidate.value), given),
    );
    if (!match) return null;
    this._codes = this._codes.filter((candidate) => candidate !== match);
    const request: PairingRequest = { id: randomBytes(16).toString('base64url'), via, userAgent, createdAt: now, status: 'pending' };
    this._requests.push(request);
    this.changed$.next();
    this.events$.next({ type: 'requested', via, userAgent });
    return request.id;
  }

  /** Запити, на які Mac ще не відповів. */
  pendingRequests(): { id: string; via: DevicePairingMode; userAgent: string | null; createdAt: string; expiresAt: string }[] {
    this._prune();
    return this._requests
      .filter((request) => request.status === 'pending')
      .map(({ id, via, userAgent, createdAt }) => ({
        id,
        via,
        userAgent,
        createdAt: new Date(createdAt).toISOString(),
        expiresAt: new Date(createdAt + REQUEST_TTL_MS).toISOString(),
      }));
  }

  /** Відповідь з Mac. «Дозволити» одразу заводить пристрій, токен чекає, поки пристрій його забере. */
  /** «Дозволити» спершу питає Touch ID: пристрій отримує токен лише після підтвердження власника. */
  async answer(id: string, approve: boolean): Promise<void> {
    this._prune();
    if (approve && this._requests.some((candidate) => candidate.id === id && candidate.status === 'pending')) {
      await this._ownerAuth.confirm('дозволити новому пристрою доступ до MaControl');
    }
    const request = this._requests.find((candidate) => candidate.id === id && candidate.status === 'pending');
    if (!request) return;
    request.answeredAt = Date.now();
    if (approve) {
      const token = randomBytes(32).toString('base64url');
      const dto: CreateDeviceDto = { tokenHash: sha256(token), userAgent: request.userAgent, createdAt: new Date().toISOString(), via: request.via };
      request.deviceId = this._devices.create(dto).id;
      request.status = 'approved';
      request.token = token;
    } else {
      request.status = 'denied';
    }
    this.changed$.next();
    this.events$.next({ type: approve ? 'approved' : 'denied', via: request.via, userAgent: request.userAgent });
  }

  /** Стан запиту для пристрою, що чекає. Токен віддається лише раз, далі запит зникає. */
  poll(id: string): PairingPollResult {
    this._prune();
    const request = this._requests.find((candidate) => candidate.id === id);
    if (!request) return { status: 'expired' };
    if (request.status === 'pending') return { status: 'pending' };
    this._requests = this._requests.filter((candidate) => candidate !== request);
    return request.status === 'approved' && request.token && request.deviceId !== undefined
      ? { status: 'approved', token: request.token, deviceId: request.deviceId, via: request.via }
      : { status: 'denied' };
  }

  /** Сполучені пристрої без хешу токена, найновіші перші. */
  devices() {
    return this._devices.findMany({}, { select: DEVICE_PUBLIC_FIELDS, order: { createdAt: 'DESC' } });
  }

  /** Відкликання пристрою — теж через Touch ID. */
  async revoke(id: number): Promise<boolean> {
    await this._ownerAuth.confirm('відкликати доступ пристрою до MaControl');
    const removed = this._devices.delete({ id }) > 0;
    if (removed) this.changed$.next();
    return removed;
  }

  /** Токен пристрою, сполученого саме цим шляхом: локальний не відкриває API через tailnet, і навпаки. */
  isDeviceToken(token: string, via: DevicePairingMode): boolean {
    return this.findDeviceId(token, via) !== null;
  }

  /**
   * id пристрою за його токеном і шляхом сполучення (і позначка «щойно бачений»); null — токена немає, його відкликали
   * або він з іншого шляху: локальний токен, перехоплений у LAN по HTTP, не стає квитком через relay, і навпаки.
   */
  findDeviceId(token: string, via: DevicePairingMode): number | null {
    const now = new Date();
    const device = this._devices.findOne({ tokenHash: sha256(token), via }, { select: ['id', 'userAgent', 'lastSeenAt'] });
    if (!device) return null;
    this._devices.update({ id: device.id }, { lastSeenAt: now.toISOString() });
    const away = device.lastSeenAt ? now.getTime() - Date.parse(device.lastSeenAt) : Infinity;
    if (away > RECONNECT_GAP_MS) this.events$.next({ type: 'connected', via, userAgent: device.userAgent });
    return device.id;
  }

  deviceExists(id: number): boolean {
    return this._devices.exists({ id });
  }

  /** Протухлі запити: без відповіді або з відповіддю, яку пристрій так і не забрав. Mac ховає їх сам за `expiresAt`. */
  private _prune() {
    const now = Date.now();
    this._requests = this._requests.filter((request) =>
      request.status === 'pending' ? now - request.createdAt < REQUEST_TTL_MS : now - (request.answeredAt ?? 0) < ANSWER_TTL_MS,
    );
  }
}
