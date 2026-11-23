/** Глобальні секрети аппки: перше ім'я — основне, решта — старі імена, які ще читаємо. */
export const APP_SECRET_KEYS = {
  /** Ключ воркспейсу webhooxy: ним агент підписує `proxy_auth` і `auth.token` WS. Один на аппку. */
  workspaceToken: ['WEBHOOXY_WORKSPACE_TOKEN'],
  /** Ключ JWT аппки (HS256): квитки viewer-ів relay тощо. Спільний з Web UI. */
  jwtKey: ['MACONTROL_JWT_KEY', 'WEBHOOXY_JWT_TICKET_KEY'],
  /** Пароль входу у Web UI (через Tailscale), щонайменше 12 символів. Перевіряє лише агент. */
  dashboardPassword: ['MACONTROL_DASHBOARD_PASSWORD'],
} as const;

export type AppSecretField = keyof typeof APP_SECRET_KEYS;
