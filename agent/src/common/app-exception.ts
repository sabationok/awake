import { HttpStatus } from '@nestjs/common';
import type { AppNextStep } from '@awake/contracts';

export const API_ERROR_CODES = {
  unauthorized: 'UNAUTHORIZED',
  /** Потрібен вхід паролем (або сполучення): відповідь несе `next`. */
  authRequired: 'AUTH_REQUIRED',
  /** Пароль дашборду не задано в «Ключах аппки» на Mac. */
  passwordNotSet: 'PASSWORD_NOT_SET',
  invalidPassword: 'INVALID_PASSWORD',
  tooManyAttempts: 'TOO_MANY_ATTEMPTS',
  /** Запит із чужого сайту (Origin не наш) на роут із кукі. */
  forbiddenOrigin: 'FORBIDDEN_ORIGIN',
  untrustedNetwork: 'UNTRUSTED_NETWORK',
  invalidCommand: 'INVALID_COMMAND',
  macOffline: 'MAC_OFFLINE',
  /** Агента вимкнено на Mac: Telegram і веб не керують, сервер працює. */
  agentDisabled: 'AGENT_DISABLED',
  internal: 'INTERNAL',
} as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/** Свідома помилка API з кодом. */
export class AppException extends Error {
  constructor(
    readonly innerCode: ApiErrorCode,
    message: string,
    readonly status: HttpStatus = HttpStatus.BAD_REQUEST,
    /** Що клієнту робити далі (крок, а не сторінка). */
    readonly next?: AppNextStep,
  ) {
    super(message);
  }
}
