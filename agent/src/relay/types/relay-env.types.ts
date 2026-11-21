/** Ключі relay агента: доступ host-а до webhooxy і ключ квитків viewer-а. */
export interface RelayEnv {
  /** Токен воркспейсу webhooxy (лише в агента). */
  workspaceToken: string;
  /** DEST, з якого webhooxy бере room. */
  destId: string;
  /** `mt_workspace` у handshake. */
  workspace: string;
  /** Room DEST-а: для перевірки `room` у квитку viewer-а. */
  room: string;
  /** WEBHOOXY_JWT_TICKET_KEY: спільний з дашбордом ключ HS256. */
  ticketKey: string;
}
