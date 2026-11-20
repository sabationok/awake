/**
 * SAN для серверного сертифіката: кожна LAN-адреса, loopback і імена хоста.
 * Для hostname без крапки додаємо <hostname>.local, бо так Mac видно в мережі.
 */
export function buildSubjectAltName(addresses: string[], hostname: string): string {
  const names = new Set<string>(['IP:127.0.0.1', 'DNS:localhost']);
  for (const address of addresses) names.add(`IP:${address}`);
  const host = hostname.trim();
  if (host) {
    names.add(`DNS:${host}`);
    if (!host.includes('.')) names.add(`DNS:${host}.local`);
  }
  return `subjectAltName=${[...names].join(',')}`;
}
