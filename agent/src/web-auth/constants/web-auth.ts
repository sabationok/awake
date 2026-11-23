import type { WebSessionIdleMinutes } from '@awake/contracts';

/** Перша сесія після схвалення пейрингу, коли таймаут ще ніхто не вибирав. */
export const DEFAULT_IDLE_MINUTES: WebSessionIdleMinutes = 5;
/** Кука пристрою живе стільки ж, скільки дозволяє браузер (400 днів — стеля Chrome). */
export const DEVICE_COOKIE_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;
/** Мінімальна довжина пароля дашборду: коротший вважається незаданим. */
export const MIN_PASSWORD_LENGTH = 12;
/** Ліміт входу: стільки невдалих спроб за вікно на пристрій, далі 429 до кінця вікна. */
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** Відкликані й протухлі сесії видаляються, коли старші за це. */
export const SESSION_RETENTION_MS = 24 * 60 * 60 * 1000;
