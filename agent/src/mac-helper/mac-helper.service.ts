import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { BehaviorSubject } from 'rxjs';
import type { HelperAction, HelperResult, HelperState, HelperToServerMessage, ServerToHelperMessage } from '@awake/contracts';
import { AGENT_CONFIG, AgentConfig } from '../config/agent-config';

/** Пауза перед новим запуском помічника, якщо він завершився або його файла немає. */
const RESTART_MS = 3_000;
/** Скільки чекаємо відповідь на запит. */
const REQUEST_TIMEOUT_MS = 5_000;

interface Pending {
  resolve: (result: HelperResult) => void;
  timer: NodeJS.Timeout;
}

/**
 * Помічник на чистому Swift: підпроцес сервера і єдиний, хто звертається до macOS.
 * Сервер шле йому запити (примітиви) і отримує стан; рішень помічник не приймає.
 */
@Injectable()
export class MacHelperService implements OnApplicationShutdown {
  private readonly _logger = new Logger(MacHelperService.name);
  /** null — помічник не запущений або ще не дав стану. */
  readonly state$ = new BehaviorSubject<HelperState | null>(null);
  private _process: ChildProcessWithoutNullStreams | null = null;
  private readonly _pending = new Map<string, Pending>();
  private _stopping = false;
  private _missingLogged = false;

  constructor(@Inject(AGENT_CONFIG) private readonly _config: AgentConfig) {}

  start() {
    if (this._process || this._stopping) return;
    const path = this._config.helperPath;
    if (!path || !existsSync(path)) {
      if (!this._missingLogged) this._logger.error(`helper binary not found: ${path ?? '(MACONTROL_HELPER not set)'}`);
      this._missingLogged = true;
      this._retry();
      return;
    }
    this._missingLogged = false;
    const child = spawn(path, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    this._process = child;
    createInterface({ input: child.stdout }).on('line', (line) => this._handleLine(line));
    child.stderr.on('data', (chunk: Buffer) => this._logger.warn(`helper: ${chunk.toString().trim()}`));
    child.on('error', (error) => this._logger.error(`helper failed to start: ${error.message}`));
    child.on('close', (code) => {
      this._process = null;
      this.state$.next(null);
      this._failPending('helper exited');
      if (this._stopping) return;
      this._logger.warn(`helper exited with code ${code}, restarting`);
      this._retry();
    });
  }

  /** Виконати примітив. Не кидає: збій приходить як `ok: false`. */
  run(action: HelperAction, value?: number | boolean, name?: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<HelperResult> {
    const id = randomUUID();
    const child = this._process;
    if (!child) return Promise.resolve({ id, ok: false, error: 'helper is not running' });
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._pending.delete(id);
        resolve({ id, ok: false, error: 'helper did not answer' });
      }, timeoutMs);
      this._pending.set(id, { resolve, timer });
      const message: ServerToHelperMessage = { type: 'request', data: { id, action, value, name } };
      child.stdin.write(`${JSON.stringify(message)}\n`);
    });
  }

  onApplicationShutdown() {
    this._stopping = true;
    // Закритий stdin — сигнал помічнику завершитись.
    this._process?.stdin.end();
  }

  private _retry() {
    setTimeout(() => this.start(), RESTART_MS).unref();
  }

  private _failPending(error: string) {
    for (const [id, pending] of this._pending) {
      clearTimeout(pending.timer);
      pending.resolve({ id, ok: false, error });
    }
    this._pending.clear();
  }

  private _handleLine(line: string) {
    let message: HelperToServerMessage;
    try {
      message = JSON.parse(line) as HelperToServerMessage;
    } catch {
      this._logger.warn(`bad line from helper: ${line.slice(0, 200)}`);
      return;
    }
    switch (message.type) {
      case 'hello':
        this._logger.log(`helper ${message.data.version} started, pid ${message.data.pid}`);
        return;
      case 'state':
        this.state$.next(message.data);
        return;
      case 'result': {
        const pending = this._pending.get(message.data.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this._pending.delete(message.data.id);
        pending.resolve(message.data);
        return;
      }
    }
  }
}
