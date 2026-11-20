/** Що зберігаємо в leaf.json: за яким списком LAN-адрес і до якої дати виданий сертифікат. */
export interface LeafIndex {
  addresses: string[];
  keyPath: string;
  certPath: string;
  expiresAt: string;
}

/** Готовий до використання сертифікат агента в пам'яті. */
export interface TlsMaterial {
  key: Buffer;
  cert: Buffer;
  addresses: string[];
}
