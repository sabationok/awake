/** Що зберігаємо в leaf.json: на кого, за яким списком LAN-адрес і до якої дати виданий сертифікат. */
export interface LeafIndex {
  /** На кого виданий; зміна імені теж перевипускає сертифікат. */
  subject?: string;
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
