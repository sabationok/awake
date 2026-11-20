import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Subject } from 'rxjs';
import { DevicesRepository } from '../repositories/devices.repository';

/** Код живе стільки, а попередній ще приймається один період, щоб не зламати щойно відкрите посилання. */
const CODE_TTL_MS = 2 * 60 * 1000;
/** Скільки запит на сполучення чекає відповіді на Mac. */
const REQUEST_TTL_MS = 2 * 60 * 1000;
/** Відповідь (дозволено / відхилено) пристрій має забрати за цей час. */
const ANSWER_TTL_MS = 60 * 1000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export type PairingRequestStatus = 'pending' | 'approved' | 'denied' | 'expired';

interface PairingRequest {
  id: string;
  userAgent: string | null;
  createdAt: number;
  status: 'pending' | 'approved' | 'denied';
  answeredAt?: number;
  /** Видається пристрою один раз, коли він забирає дозвіл. */
  token?: string;
}

/**
 * Сполучення як у месенджерах: пристрій відкриває посилання з QR (одноразовий код), агент заводить запит,
 * Mac-аппка питає «Це ви?», і лише після «Дозволити» пристрій отримує свій токен.
 * Код публікується в Upstash разом з адресою; токен пристрою не залишає браузер, у базі лише його хеш.
 */
@Injectable()
export class PairingService {
  private _codes: { value: string; issuedAt: number }[] = [];
  private _requests: PairingRequest[] = [];
  /** Змінився список пристроїв або запитів: Mac-аппці треба новий знімок. */
  readonly changed$ = new Subject<void>();

  constructor(private readonly _devices: DevicesRepository) {}

  currentCode(): string {
    return this.currentCodeInfo().value;
  }

  /** Поточний код і коли його перестануть видавати (ще один період його приймають). */
  currentCodeInfo(): { value: string; expiresAt: number } {
    const now = Date.now();
    this._codes = this._codes.filter((code) => now - code.issuedAt < CODE_TTL_MS * 2);
    const latest = this._codes.at(-1);
    if (latest && now - latest.issuedAt < CODE_TTL_MS) return { value: latest.value, expiresAt: latest.issuedAt + CODE_TTL_MS };
    const code = { value: randomBytes(16).toString('base64url'), issuedAt: now };
    this._codes.push(code);
    return { value: code.value, expiresAt: now + CODE_TTL_MS };
  }

  /** Міняє код на запит, що чекає підтвердження на Mac. Код після цього недійсний. */
  request(code: string, userAgent: string | null): string | null {
    const now = Date.now();
    const given = Buffer.from(code);
    const match = this._codes.find(
      (candidate) =>
        now - candidate.issuedAt < CODE_TTL_MS * 2 &&
        candidate.value.length === code.length &&
        timingSafeEqual(Buffer.from(candidate.value), given),
    );
    if (!match) return null;
    this._codes = this._codes.filter((candidate) => candidate !== match);
    const request: PairingRequest = { id: randomBytes(16).toString('base64url'), userAgent, createdAt: now, status: 'pending' };
    this._requests.push(request);
    this.changed$.next();
    return request.id;
  }

  /** Запити, на які Mac ще не відповів. */
  pendingRequests(): { id: string; userAgent: string | null; createdAt: string; expiresAt: string }[] {
    this._prune();
    return this._requests
      .filter((request) => request.status === 'pending')
      .map(({ id, userAgent, createdAt }) => ({
        id,
        userAgent,
        createdAt: new Date(createdAt).toISOString(),
        expiresAt: new Date(createdAt + REQUEST_TTL_MS).toISOString(),
      }));
  }

  /** Відповідь з Mac. «Дозволити» одразу заводить пристрій, токен чекає, поки пристрій його забере. */
  answer(id: string, approve: boolean): void {
    this._prune();
    const request = this._requests.find((candidate) => candidate.id === id && candidate.status === 'pending');
    if (!request) return;
    request.answeredAt = Date.now();
    if (approve) {
      const token = randomBytes(32).toString('base64url');
      this._devices.create({ tokenHash: sha256(token), userAgent: request.userAgent, createdAt: new Date().toISOString() });
      request.status = 'approved';
      request.token = token;
    } else {
      request.status = 'denied';
    }
    this.changed$.next();
  }

  /** Стан запиту для пристрою, що чекає. Токен віддається лише раз, далі запит зникає. */
  poll(id: string): { status: PairingRequestStatus; token?: string } {
    this._prune();
    const request = this._requests.find((candidate) => candidate.id === id);
    if (!request) return { status: 'expired' };
    if (request.status === 'pending') return { status: 'pending' };
    this._requests = this._requests.filter((candidate) => candidate !== request);
    return request.status === 'approved' ? { status: 'approved', token: request.token } : { status: 'denied' };
  }

  revoke(id: number): boolean {
    const removed = this._devices.remove(id);
    if (removed) this.changed$.next();
    return removed;
  }

  isDeviceToken(token: string): boolean {
    return this._devices.touch(sha256(token), new Date().toISOString());
  }

  /** Протухлі запити: без відповіді або з відповіддю, яку пристрій так і не забрав. Mac ховає їх сам за `expiresAt`. */
  private _prune() {
    const now = Date.now();
    this._requests = this._requests.filter((request) =>
      request.status === 'pending' ? now - request.createdAt < REQUEST_TTL_MS : now - (request.answeredAt ?? 0) < ANSWER_TTL_MS,
    );
  }
}
