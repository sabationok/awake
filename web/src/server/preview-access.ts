/**
 * TEMP: тестовий вхід для preview stage. Пароль не секрет — форма входу підставляє його сама,
 * а сервер приймає його лише в preview, де Web UI не робить жодного запиту до агента.
 * Справжні stage (dev, production) беруть DASHBOARD_PASSWORD і SESSION_SECRET з env, як і раніше.
 */
export const PREVIEW_PASSWORD = 'preview-macontrol';
export const PREVIEW_SESSION_SECRET = 'preview-stage-session-secret-not-for-real-data';
