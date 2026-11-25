import { REFUSAL_INTERVAL_MS, REFUSAL_USERS_LIMIT } from '../constants/refusal';

/**
 * Обмежувач відповіді «Недоступно»: учасник групи може тиснути кнопку під повідомленням бота скільки завгодно, а
 * кожна відповідь — виклик Bot API. Одна відповідь на користувача за вікно; решта натискань лишається без відповіді.
 */
export class RefusalThrottle {
  private readonly _lastByUser = new Map<number, number>();

  /** true — цьому користувачу зараз можна відповісти. */
  allow(userId: number | undefined, now: number = Date.now()): boolean {
    if (userId === undefined) return false;
    if (now - (this._lastByUser.get(userId) ?? -Infinity) < REFUSAL_INTERVAL_MS) return false;
    if (this._lastByUser.size >= REFUSAL_USERS_LIMIT) {
      for (const [id, at] of this._lastByUser) if (now - at >= REFUSAL_INTERVAL_MS) this._lastByUser.delete(id);
      // Усі свіжі (багато різних користувачів одразу): нікому більше не відповідаємо, поки вікно не мине.
      if (this._lastByUser.size >= REFUSAL_USERS_LIMIT) return false;
    }
    this._lastByUser.set(userId, now);
    return true;
  }
}
