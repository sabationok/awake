/** Лише внутрішній шлях: без `//`, без протоколу, щоб не відправити користувача на чужий сайт. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/app';
  return value;
}
