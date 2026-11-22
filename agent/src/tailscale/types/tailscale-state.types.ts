/** Що агент знає про Tailscale на цьому Mac. */
export interface TailscaleState {
  /** CLI знайдено. */
  installed: boolean;
  /** Mac у tailnet (`BackendState = Running`). */
  running: boolean;
  /** `<mac>.<tailnet>.ts.net` без крапки в кінці. */
  dnsName: string | null;
  /** Логін власника Mac у tailnet: лише його пристрої пускаємо. */
  login: string | null;
  /** `tailscale serve` веде https:443 на http-порт агента. */
  serving: boolean;
  error: string | null;
}
