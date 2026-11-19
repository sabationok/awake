import { networkInterfaces } from 'node:os';

/** IPv4-адреса Mac у локальній мережі: спершу Wi-Fi (en0), потім інші en*. */
export function findLanAddress(): string | null {
  const interfaces = networkInterfaces();
  const names = Object.keys(interfaces).filter((name) => name.startsWith('en')).sort();
  for (const name of names) {
    const address = interfaces[name]?.find((entry) => entry.family === 'IPv4' && !entry.internal);
    if (address) return address.address;
  }
  return null;
}
