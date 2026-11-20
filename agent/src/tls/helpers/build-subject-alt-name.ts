/**
 * SAN для серверного сертифіката: кожна LAN-адреса, loopback і <hostname>.local.
 * Голе ім'я хоста не додаємо: CA дозволено підписувати лише *.local (nameConstraints).
 */
export function buildSubjectAltName(addresses: string[], hostname: string): string {
  const names = new Set<string>(['IP:127.0.0.1', 'DNS:localhost']);
  for (const address of addresses) names.add(`IP:${address}`);
  const host = hostname.trim();
  if (host) names.add(`DNS:${host.endsWith('.local') ? host : `${host.split('.')[0]}.local`}`);
  return `subjectAltName=${[...names].join(',')}`;
}
