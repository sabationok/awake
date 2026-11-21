import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import type { EnvifyStatus } from '@awake/contracts';
import { AGENT_CONFIG, type AgentConfig } from '../../../config/agent-config';
import { fetchEnvifyConfig } from '../../helpers/fetch-envify-config';
import { readEnvifyToken } from '../../helpers/read-envify-token';

/**
 * Змінні з Envify для ключів, яких немає в process.env: тримає їх у пам'яті (у process.env не пише) і каже,
 * коли вони змінились. Тягне на старті й на запит аппки; помилка лишає попередні значення, щоб relay не падав.
 */
@Injectable()
export class EnvifyService implements OnModuleInit {
  private readonly _logger = new Logger(EnvifyService.name);
  /** Після кожного завантаження (ok, error, off): споживачі перечитують свої ключі. */
  readonly changed$ = new Subject<void>();
  private _variables: Readonly<Record<string, string>> = {};
  private _status: EnvifyStatus;
  /** Номер останнього запиту: відповідь старішого запиту ігнорується. */
  private _run = 0;

  constructor(@Inject(AGENT_CONFIG) private readonly _config: AgentConfig) {
    this._status = { state: 'off', url: _config.envifyUrl, error: null, count: 0, loadedAt: null };
  }

  get status(): EnvifyStatus {
    return this._status;
  }

  get variables(): Readonly<Record<string, string>> {
    return this._variables;
  }

  onModuleInit() {
    void this.reload();
  }

  async reload(): Promise<void> {
    const run = ++this._run;
    const url = this._config.envifyUrl;
    const token = readEnvifyToken();
    if (!token || !url) {
      this._variables = {};
      this._set({ state: 'off', error: url ? null : 'немає Envify для цього stage', count: 0, loadedAt: null });
      return;
    }
    this._set({ ...this._status, state: 'loading', error: null });
    try {
      const config = await fetchEnvifyConfig(url, token);
      if (run !== this._run) return;
      this._variables = config.variables;
      const count = Object.keys(config.variables).length;
      this._logger.log(`Envify: ${count} змінних (${config.scope.serviceId})`);
      this._set({ state: 'ok', error: config.errors.length ? config.errors.join('; ') : null, count, loadedAt: new Date().toISOString() });
    } catch (error) {
      if (run !== this._run) return;
      const message = (error as Error).message;
      this._logger.warn(`Envify: ${message}`);
      this._set({ ...this._status, state: 'error', error: message });
    }
  }

  private _set(patch: Omit<EnvifyStatus, 'url'>) {
    this._status = { url: this._config.envifyUrl, ...patch };
    this.changed$.next();
  }
}
