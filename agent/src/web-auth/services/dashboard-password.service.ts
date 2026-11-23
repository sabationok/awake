import { HttpStatus, Injectable } from '@nestjs/common';
import { scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';
import { API_ERROR_CODES, AppException } from '../../common/app-exception';
import { AppSecretsService } from '../../secrets';
import { LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS, MIN_PASSWORD_LENGTH } from '../constants/web-auth';

/**
 * Пароль Web UI з «Ключів аппки» (`MACONTROL_DASHBOARD_PASSWORD`). Порівнюються scrypt-хеші з випадковою сіллю
 * процесу: час не залежить від довжини і збігу префікса. Ліміт спроб — у пам'яті, на пристрій.
 */
@Injectable()
export class DashboardPasswordService {
  private readonly _salt = randomBytes(16);
  private readonly _failures = new Map<number, number[]>();

  constructor(private readonly _secrets: AppSecretsService) {}

  get isSet(): boolean {
    return (this._secrets.get('dashboardPassword') ?? '').length >= MIN_PASSWORD_LENGTH;
  }

  /** Кидає PASSWORD_NOT_SET / TOO_MANY_ATTEMPTS / INVALID_PASSWORD; успіх скидає лічильник пристрою. */
  verify(deviceId: number, given: string) {
    const expected = this._secrets.get('dashboardPassword') ?? '';
    if (expected.length < MIN_PASSWORD_LENGTH) {
      throw new AppException(API_ERROR_CODES.passwordNotSet, 'Dashboard password is not set on the Mac', HttpStatus.CONFLICT);
    }
    const now = Date.now();
    const recent = (this._failures.get(deviceId) ?? []).filter((at) => now - at < LOGIN_WINDOW_MS);
    if (recent.length >= LOGIN_MAX_FAILURES) {
      throw new AppException(API_ERROR_CODES.tooManyAttempts, 'Too many attempts, try again later', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (timingSafeEqual(this._hash(given), this._hash(expected))) {
      this._failures.delete(deviceId);
      return;
    }
    this._failures.set(deviceId, [...recent, now]);
    throw new AppException(API_ERROR_CODES.invalidPassword, 'Wrong password', HttpStatus.UNAUTHORIZED);
  }

  private _hash(value: string): Buffer {
    return scryptSync(value, this._salt, 32);
  }
}
