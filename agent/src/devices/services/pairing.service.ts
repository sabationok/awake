import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { DevicesRepository } from '../repositories/devices.repository';

/** Код живе стільки, а попередній ще приймається один період, щоб не зламати щойно відкрите посилання. */
const CODE_TTL_MS = 2 * 60 * 1000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * Одноразові коди сполучення для локальної сторінки і токени пристроїв.
 * Код публікується в Upstash разом з адресою; токен пристрою не залишає браузер, у базі лише його хеш.
 */
@Injectable()
export class PairingService {
  private _codes: { value: string; issuedAt: number }[] = [];

  constructor(private readonly _devices: DevicesRepository) {}

  currentCode(): string {
    const now = Date.now();
    this._codes = this._codes.filter((code) => now - code.issuedAt < CODE_TTL_MS * 2);
    const latest = this._codes.at(-1);
    if (latest && now - latest.issuedAt < CODE_TTL_MS) return latest.value;
    const code = { value: randomBytes(16).toString('base64url'), issuedAt: now };
    this._codes.push(code);
    return code.value;
  }

  /** Обмінює код на новий токен пристрою. Код після цього недійсний. */
  pair(code: string, userAgent: string | null): string | null {
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
    const token = randomBytes(32).toString('base64url');
    this._devices.create({ tokenHash: sha256(token), userAgent, createdAt: new Date(now).toISOString() });
    return token;
  }

  isDeviceToken(token: string): boolean {
    return this._devices.touch(sha256(token), new Date().toISOString());
  }
}
