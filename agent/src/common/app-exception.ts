import { HttpStatus } from '@nestjs/common';

export const API_ERROR_CODES = {
  unauthorized: 'UNAUTHORIZED',
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
  ) {
    super(message);
  }
}
