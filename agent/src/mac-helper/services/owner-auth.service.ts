import { Injectable } from '@nestjs/common';
import { MacHelperService } from '../mac-helper.service';

/** Скільки чекати відповіді власника у вікні Touch ID. */
const OWNER_AUTH_TIMEOUT_MS = 120_000;

/**
 * Підтвердження власника Touch ID (або паролем Mac) перед важливою дією: пароль Web UI, ключі, сполучення й
 * відкликання пристроїв. Яким діям воно потрібне, вирішує сервер; вікно показує помічник. Без підтвердження дія
 * не виконується, хоч би звідки прийшов запит.
 */
@Injectable()
export class OwnerAuthService {
  constructor(private readonly _helper: MacHelperService) {}

  /** Кидає, якщо власник відмовив, вікно не відкрилось або помічник не відповів. */
  async confirm(reason: string): Promise<void> {
    const result = await this._helper.run('authenticate', undefined, reason, OWNER_AUTH_TIMEOUT_MS);
    if (result.ok) return;
    throw new Error(result.error === 'cancelled' ? 'Скасовано: Touch ID не підтверджено' : `Touch ID не спрацював: ${result.error ?? 'невідома помилка'}`);
  }
}
