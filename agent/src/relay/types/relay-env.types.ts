/** З чим host підключається: DEST / workspace / room з вебхука relay, токен воркспейсу й ключ JWT — глобальні секрети. */
export interface RelayEnv {
  /** Токен воркспейсу webhooxy (лише в агента). */
  workspaceToken: string;
  /** DEST, з якого webhooxy бере room. */
  destId: string;
  /** `mt_workspace` у handshake. */
  workspace: string;
  /** Room DEST-а: для перевірки `room` у квитку viewer-а. */
  room: string;
  /** Ключ JWT аппки (MACONTROL_JWT_KEY): спільний з дашбордом ключ HS256. */
  ticketKey: string;
}
