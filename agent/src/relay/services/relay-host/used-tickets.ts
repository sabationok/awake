/** Використані jti до кінця їхнього exp: повторний квиток не пускаємо. */
export class UsedTickets {
  private readonly _until = new Map<string, number>();

  /** true, якщо jti новий (і тепер позначений); false — його вже бачили. */
  claim(jti: string, expSeconds: number, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
    for (const [id, until] of this._until) if (until < nowSeconds) this._until.delete(id);
    if (this._until.has(jti)) return false;
    this._until.set(jti, expSeconds);
    return true;
  }
}
