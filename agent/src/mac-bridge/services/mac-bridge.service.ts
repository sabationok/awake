import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { BehaviorSubject, Subject } from 'rxjs';
import type {
  AgentToMacMessage,
  CommandRequest,
  MacState,
  MacToAgentMessage,
  SessionSource,
} from '@awake/contracts';
import { writeProtocolLine } from './protocol-stdout';

type SessionMessage = Extract<MacToAgentMessage, { type: 'session' }>['data'];
type LogMessage = Extract<MacToAgentMessage, { type: 'log' }>['data'];

/** Mac вважається офлайн, якщо стан не приходив довше за цей час. */
const STATE_STALE_MS = 30_000;

/**
 * Канал з Mac-аппкою: читає JSON-рядки зі stdin, пише команди в stdout.
 * Інші модулі підписуються на потоки, а не на сам stdin.
 */
@Injectable()
export class MacBridgeService implements OnModuleInit {
  private readonly _logger = new Logger(MacBridgeService.name);
  readonly state$ = new BehaviorSubject<MacState | null>(null);
  readonly sessions$ = new Subject<SessionMessage>();
  readonly logs$ = new Subject<LogMessage>();
  private _stateAt = 0;

  onModuleInit() {
    const lines = createInterface({ input: process.stdin });
    lines.on('line', (line) => this._handleLine(line));
    // Mac-аппка закрилась: агенту більше нема кому служити.
    lines.on('close', () => {
      this._logger.log('stdin closed, exiting');
      process.exit(0);
    });
  }

  get state(): MacState | null {
    return Date.now() - this._stateAt < STATE_STALE_MS ? this.state$.value : null;
  }

  sendReady(port: number) {
    this._send({ type: 'ready', data: { port } });
  }

  sendCommand(command: CommandRequest, source: SessionSource): string {
    const id = randomUUID();
    this._send({ type: 'command', data: { ...command, id, source } });
    return id;
  }

  private _send(message: AgentToMacMessage) {
    writeProtocolLine(message);
  }

  private _handleLine(line: string) {
    if (!line.trim()) return;
    let message: MacToAgentMessage;
    try {
      message = JSON.parse(line) as MacToAgentMessage;
    } catch {
      this._logger.warn(`bad line from Mac: ${line.slice(0, 200)}`);
      return;
    }
    switch (message.type) {
      case 'state':
        this._stateAt = Date.now();
        this.state$.next(message.data);
        return;
      case 'session':
        this.sessions$.next(message.data);
        return;
      case 'log':
        this.logs$.next(message.data);
        return;
    }
  }
}
