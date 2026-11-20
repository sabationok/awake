/** Відсортований список без дублів: за ним порівнюємо LAN-адреси й шукаємо кеш leaf.json. */
export function normalizeAddresses(addresses: string[]): string[] {
  return [...new Set(addresses)].sort();
}
