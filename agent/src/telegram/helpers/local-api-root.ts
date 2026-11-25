const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

/**
 * Адреса Bot API для перевірки на локальному mock-сервері (mock-api, префікс /telegram). Приймаємо лише http на loopback:
 * будь-яка інша адреса — null, щоб справжній токен ніколи не пішов на чужий хост.
 */
export function localApiRoot(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' || !LOCAL_HOSTS.has(url.hostname)) return null;
    // Telegraf будує адресу як new URL('./bot<token>/<method>', apiRoot): без «/» в кінці останній сегмент шляху губиться.
    return `${url.origin}${url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`}`;
  } catch {
    return null;
  }
}
