import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Subject } from 'rxjs';
import type { Webhook, WebhookInput, WebhookType } from '@awake/contracts';
import { readEnvFile } from '../../../secrets';
import { generateWhId } from '../../helpers/generate-wh-id';
import { WebhooksRepository } from '../../repositories/webhooks.repository';

const LEGACY_RELAY_ENV_PATH = join(homedir(), '.config/awake/relay.env');

/**
 * Вебхуки webhooxy, якими користується агент. Webhooxy реєструє вебхук сам на першому вхідному запиті,
 * тож тут лише пам'ять агента: id, тип, режим, DEST і конфіг типу. Секрети — в AppSecretsService.
 */
@Injectable()
export class WebhooksService implements OnModuleInit {
  private readonly _logger = new Logger(WebhooksService.name);
  /** Список змінився: relay перепідключається, аппці новий знімок. */
  readonly changed$ = new Subject<void>();

  constructor(private readonly _repository: WebhooksRepository) {}

  onModuleInit() {
    this._importLegacyRelay();
  }

  findMany(): Webhook[] {
    return this._repository.findMany();
  }

  /** Увімкнений вебхук типу; перший, якщо їх кілька. */
  findActive(type: WebhookType): Webhook | null {
    return this.findMany().find((webhook) => webhook.type === type && !webhook.disabledAt) ?? null;
  }

  save(input: WebhookInput): Webhook | null {
    const now = new Date().toISOString();
    const data = {
      whId: input.whId || generateWhId(),
      provider: input.provider,
      type: input.type,
      mode: input.mode,
      workspace: input.workspace,
      destId: input.destId,
      config: input.type === 'relay' ? { room: input.config.room } : {},
    };
    let id = input.id;
    if (id === undefined) id = this._repository.create({ ...data, createdAt: now });
    else if (!this._repository.update(id, data, now)) return null;
    this.changed$.next();
    return this._repository.findOne(id);
  }

  setEnabled(id: number, enabled: boolean) {
    const now = new Date().toISOString();
    if (this._repository.setDisabledAt(id, enabled ? null : now, now)) this.changed$.next();
  }

  delete(id: number) {
    if (this._repository.softDelete(id, new Date().toISOString())) this.changed$.next();
  }

  /** relay.env з workspace / DEST / room (до вебхуків у SQLite): переносимо relay один раз. Секрети лишаються там, де були. */
  private _importLegacyRelay() {
    if (this._repository.hasEverType('relay')) return;
    const file = readEnvFile(process.env.MACONTROL_RELAY_ENV || LEGACY_RELAY_ENV_PATH);
    const pick = (name: string) => process.env[name] || file.get(name);
    const workspace = pick('WEBHOOXY_WORKSPACE');
    const destId = pick('WEBHOOXY_DEST_ID');
    const room = pick('WEBHOOXY_ROOM');
    if (!workspace || !destId || !room) return;
    this._repository.create({
      whId: generateWhId(),
      provider: 'macontrol',
      type: 'relay',
      mode: 'stream',
      workspace,
      destId,
      config: { room },
      createdAt: new Date().toISOString(),
    });
    this._logger.log('relay webhook imported from relay.env');
  }
}
