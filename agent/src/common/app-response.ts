import type { AppResponse as AppResponseShape } from '@awake/contracts';

/** Конверт усіх відповідей API. */
export class AppResponse<T> implements AppResponseShape<T> {
  private constructor(
    readonly ok: boolean,
    readonly data?: T,
    readonly error?: { code: string; message: string },
  ) {}

  static ok<T>(data: T): AppResponse<T> {
    return new AppResponse(true, data);
  }

  static fail(code: string, message: string): AppResponse<never> {
    return new AppResponse<never>(false, undefined, { code, message });
  }
}
