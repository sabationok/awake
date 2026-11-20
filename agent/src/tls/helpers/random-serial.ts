import { randomBytes } from 'node:crypto';

/** Випадковий додатний серійний номер у hex для openssl -set_serial. */
export function randomSerial(): string {
  const bytes = randomBytes(16);
  bytes[0] &= 0x7f;
  return `0x${bytes.toString('hex')}`;
}
