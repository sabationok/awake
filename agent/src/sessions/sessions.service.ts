import { Injectable } from '@nestjs/common';
import type { MacToAgentMessage, SessionRecord } from '@awake/contracts';
import { SessionsRepository } from './repositories/sessions.repository';

type SessionEvent = Extract<MacToAgentMessage, { type: 'session' }>['data'];

@Injectable()
export class SessionsService {
  constructor(private readonly _sessions: SessionsRepository) {}

  /** start і restart відкривають нову сесію, stop закриває поточну. */
  applyEvent(event: SessionEvent) {
    const battery = event.battery ?? null;
    switch (event.event) {
      case 'start':
        // Незакрита сесія перед новим стартом означає збій: аппку вбили під час сесії.
        this._sessions.closeOpen({ endedAt: event.at, endReason: 'перервано', batteryEnd: null });
        this._sessions.create({ startedAt: event.at, duration: event.duration ?? null, source: event.source, batteryStart: battery });
        return;
      case 'restart':
        this._sessions.closeOpen({ endedAt: event.at, endReason: 'перезапуск', batteryEnd: battery });
        this._sessions.create({ startedAt: event.at, duration: event.duration ?? null, source: event.source, batteryStart: battery });
        return;
      case 'stop':
        this._sessions.closeOpen({ endedAt: event.at, endReason: event.reason ?? null, batteryEnd: battery });
        return;
    }
  }

  findMany(query: { limit: number }): SessionRecord[] {
    return this._sessions.findMany(query);
  }
}
