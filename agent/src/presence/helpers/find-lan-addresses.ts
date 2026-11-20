import { networkInterfaces } from 'node:os';

/** Усі IPv4-адреси Mac у локальній мережі з en*: спершу Wi-Fi (en0), потім інші. */
export function findLanAddresses(): string[] {
  const interfaces = networkInterfaces();
  const names = Object.keys(interfaces).filter((name) => name.startsWith('en')).sort();
  return names.flatMap((name) =>
    (interfaces[name] ?? []).filter((entry) => entry.family === 'IPv4' && !entry.internal).map((entry) => entry.address),
  );
}
