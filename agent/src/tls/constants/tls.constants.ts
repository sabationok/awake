const DAY_MS = 24 * 60 * 60 * 1000;

export const OPENSSL_BIN = '/usr/bin/openssl';
export const CA_SUBJECT = '/CN=MacCC Local CA';
/** Сертифікат видається на аппку, а не на її модуль чи процес агента. */
export const LEAF_SUBJECT = '/CN=MaControl';
/** Довше 825 днів Apple не довіряє, тож 397 з запасом. */
export const CA_VALIDITY_DAYS = 3650;
export const LEAF_VALIDITY_DAYS = 397;
/** Сертифікат, що спливає раніше ніж за цей час, перевипускаємо. */
export const LEAF_RENEW_BEFORE_MS = 30 * DAY_MS;
/** Як часто перевіряємо LAN-адреси й термін сертифіката. */
export const TLS_CHECK_INTERVAL_MS = 30_000;
