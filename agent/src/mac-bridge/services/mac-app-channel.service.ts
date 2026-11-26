import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { chmodSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { connect, createServer, type Server, type Socket } from 'node:net';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';
import { Subject } from 'rxjs';
import type { AgentToMacMessage } from '@awake/contracts';
import { AGENT_CONFIG, AgentConfig } from '../../config/agent-config';

/** Типи, останній рядок яких новий клієнт отримує одразу після підключення. */
const REPLAYED: ReadonlySet<AgentToMacMessage['type']> = new Set([
  'ready',
  'state',
  'tree',
  'settings',
  'devices',
  'secrets',
  'trustedNetworks',
  'webhooks',
  'server',
]);

/**
 * Канал для Mac-аппки як клієнта (режим standalone): локальний Unix-сокет з тими самими JSON-рядками,
 * що раніше йшли через stdin / stdout. Аппка тут така сама, як Web UI: отримує знімки й шле натискання.
 * Сокет доступний лише власнику (права 600), тож токен не потрібен. Клієнтів може бути кілька.
 */
@Injectable()
export class MacAppChannelService implements OnApplicationShutdown {
  private readonly _logger = new Logger(MacAppChannelService.name);
  /** Рядки від клієнтів. */
  readonly lines$ = new Subject<string>();
  /** Останній клієнт відключився. */
  readonly empty$ = new Subject<void>();
  private readonly _clients = new Set<Socket>();
  private readonly _last = new Map<string, string>();
  private _server: Server | null = null;

  constructor(@Inject(AGENT_CONFIG) private readonly _config: AgentConfig) {}

  start() {
    const path = this._config.appSocketPath;
    mkdirSync(dirname(path), { recursive: true });
    // Сокет лишився від сервера, що впав: якщо на ньому ніхто не слухає, прибираємо його.
    const probe = connect(path);
    probe.once('connect', () => {
      probe.destroy();
      this._logger.error(`another server already listens on ${path}`);
    });
    probe.once('error', () => {
      rmSync(path, { force: true });
      this._listen(path);
    });
  }

  send(message: AgentToMacMessage) {
    const line = `${JSON.stringify(message)}\n`;
    if (REPLAYED.has(message.type)) this._last.set(message.type, line);
    for (const client of this._clients) client.write(line);
  }

  onApplicationShutdown() {
    for (const client of this._clients) client.destroy();
    this._server?.close();
    if (this._server) {
      rmSync(this._config.appSocketPath, { force: true });
      rmSync(this._config.serverInfoPath, { force: true });
    }
  }

  private _listen(path: string) {
    const server = createServer((client) => this._accept(client));
    server.on('error', (error) => this._logger.error(`app channel failed: ${error.message}`));
    server.listen(path, () => {
      chmodSync(path, 0o600);
      this._writeInfo();
      this._logger.log(`app channel listens on ${path}`);
    });
    this._server = server;
  }

  private _accept(client: Socket) {
    this._clients.add(client);
    for (const line of this._last.values()) client.write(line);
    createInterface({ input: client }).on('line', (line) => this.lines$.next(line));
    client.on('error', () => client.destroy());
    client.on('close', () => {
      this._clients.delete(client);
      if (this._clients.size === 0) this.empty$.next();
    });
  }

  /** Паспорт запущеного сервера: за ним аппка бачить, що працює стара збірка, і перезапускає її. */
  private _writeInfo() {
    const script = process.argv[1] ?? '';
    const info = { pid: process.pid, script, scriptModifiedAt: existsSync(script) ? statSync(script).mtimeMs / 1000 : null };
    writeFileSync(this._config.serverInfoPath, JSON.stringify(info));
  }
}
