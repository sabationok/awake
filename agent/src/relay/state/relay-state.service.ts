import { Injectable } from '@nestjs/common';
import { BehaviorSubject } from 'rxjs';
import { RELAY_SESSIONS_LIMIT } from '../constants/relay-limits';
import type { RelayStateSnapshot, RelayStatus, RelayViewerSession } from '../types/relay-status.types';

/**
 * Стан relay без залежностей: його пише RelayHostService, читають модуль MaControl (сторінка, /status)
 * і сповіщення Telegram. Окремо від host-а, щоб реєстр модулів не залежав від сокета.
 */
@Injectable()
export class RelayStateService {
  readonly state$ = new BehaviorSubject<RelayStateSnapshot>({
    status: 'unconfigured',
    reason: null,
    since: new Date().toISOString(),
    viewers: [],
  });

  get state(): RelayStateSnapshot {
    return this.state$.value;
  }

  setStatus(status: RelayStatus, reason: string | null = null) {
    const current = this.state$.value;
    if (current.status === status && current.reason === reason) return;
    this.state$.next({ ...current, status, reason, since: new Date().toISOString() });
  }

  addViewer(session: RelayViewerSession) {
    const current = this.state$.value;
    this.state$.next({ ...current, viewers: [session, ...current.viewers].slice(0, RELAY_SESSIONS_LIMIT) });
  }
}
