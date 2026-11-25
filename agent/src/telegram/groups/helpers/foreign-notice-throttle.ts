import { FOREIGN_NOTICE_CAP, FOREIGN_NOTICE_KEYS_LIMIT, FOREIGN_NOTICE_WINDOW_MS } from '../constants/telegram-group-guards';
import type { ForeignNoticeDto } from '../dto/foreign-notice.dto';
import type { ForeignNoticeDecision } from '../types/foreign-notice.types';

/**
 * Обмежувач сповіщень «бота додали в чужу групу». Додати бота може будь-хто, хто знає його @username, тож без
 * обмеження цим можна засипати приватний чат власника. Одне сповіщення на чат і на того, хто додав, за вікно;
 * не більше `FOREIGN_NOTICE_CAP` за вікно загалом, далі один підсумок і тиша. Лише пам'ять: після перезапуску з нуля.
 */
export class ForeignNoticeThrottle {
  private readonly _lastByKey = new Map<string, number>();
  private _windowStart = 0;
  private _sent = 0;
  private _suppressed = 0;
  private _summarized = false;

  decide(dto: ForeignNoticeDto, now: number = Date.now()): ForeignNoticeDecision {
    let carried = 0;
    if (now - this._windowStart >= FOREIGN_NOTICE_WINDOW_MS) {
      carried = this._suppressed;
      this._windowStart = now;
      this._sent = 0;
      this._suppressed = 0;
      this._summarized = false;
    }
    const keys = [`chat:${dto.chatId}`, `user:${dto.adderId}`];
    if (keys.some((key) => now - (this._lastByKey.get(key) ?? -Infinity) < FOREIGN_NOTICE_WINDOW_MS)) return this._suppress(carried);
    if (this._sent >= FOREIGN_NOTICE_CAP) {
      this._suppress(carried);
      if (this._summarized) return { kind: 'skip' };
      this._summarized = true;
      return { kind: 'summary' };
    }
    this._sent += 1;
    for (const key of keys) this._lastByKey.set(key, now);
    this._prune(now);
    return { kind: 'notify', suppressed: carried };
  }

  /** Приглушене рахується; не показаний залишок минулого вікна переходить у це. */
  private _suppress(carried: number): ForeignNoticeDecision {
    this._suppressed += 1 + carried;
    return { kind: 'skip' };
  }

  private _prune(now: number) {
    if (this._lastByKey.size <= FOREIGN_NOTICE_KEYS_LIMIT) return;
    for (const [key, at] of this._lastByKey) if (now - at >= FOREIGN_NOTICE_WINDOW_MS) this._lastByKey.delete(key);
    // Усі ще свіжі (масова атака різними чатами): викидаємо найстаріші, загальний ліміт вікна тримає й без них.
    for (const key of this._lastByKey.keys()) {
      if (this._lastByKey.size <= FOREIGN_NOTICE_KEYS_LIMIT) break;
      this._lastByKey.delete(key);
    }
  }
}
