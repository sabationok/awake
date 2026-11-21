/**
 * Стан host-а relay:
 * off — вимкнено перемикачем; unconfigured — немає relay.env або URL webhooxy цього stage;
 * connecting → online; offline — зв'язок упав, socket.io пробує знову;
 * evicted — інший host зайняв кімнату; refused — webhooxy відмовив у handshake.
 */
export type RelayStatus = 'off' | 'unconfigured' | 'connecting' | 'online' | 'offline' | 'evicted' | 'refused';

/** Viewer, якого агент пустив у кімнату. */
export interface RelayViewerSession {
  viewerId: string;
  /** Користувач дашборду з квитка. */
  sub: string;
  origin: string | null;
  userAgent: string | null;
  /** Через який проксі прийшов viewer; для relay завжди webhooxy. null — напряму (на майбутнє). */
  proxy: string | null;
  authorizedAt: string;
}

/** Ліміти кімнати, як їх розрезолвив webhooxy (`relay:limits:effective` або ack `relay:limits`). */
export interface RelayLimitsState {
  /** Усі поля RelayLimitsDef з default-ами; null — ще не підключались. */
  effective: Record<string, unknown> | null;
  /** Чи діє наш override. */
  override: boolean;
  /** Останнє `relay:limits`, яке webhooxy не прийняв. */
  error: string | null;
}

export interface RelayStateSnapshot {
  status: RelayStatus;
  /** Причина для offline / refused / evicted. */
  reason: string | null;
  since: string;
  viewers: RelayViewerSession[];
  limits: RelayLimitsState;
}
