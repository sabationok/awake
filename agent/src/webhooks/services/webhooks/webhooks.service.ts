import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Subject } from 'rxjs';
import type { Webhook, WebhookInput, WebhookType } from '@awake/contracts';
import { readEnvFile } from '../../../secrets';
import { generateWhId } from '../../helpers/generate-wh-id';
import type { SaveWebhookDto } from '../../dto/save-webhook.dto';
import type { SetWebhookDisabledDto } from '../../dto/set-webhook-disabled.dto';
import { toWebhook } from '../../helpers/to-webhook';
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
    return this._repository.findMany({}, { order: { createdAt: 'ASC', id: 'ASC' } }).map(toWebhook);
  }

  /** Увімкнений вебхук типу; перший, якщо їх кілька. */
  findActive(type: WebhookType): Webhook | null {
    return this.findMany().find((webhook) => webhook.type === type && !webhook.disabledAt) ?? null;
  }

  save(input: WebhookInput): Webhook | null {
    const dto: SaveWebhookDto = {
      whId: input.whId || generateWhId(),
      provider: input.provider,
      type: input.type,
      mode: input.mode,
      workspace: input.workspace,
      destId: input.destId,
      config: input.type === 'relay' ? { room: input.config.room } : {},
    };
    let id = input.id;
    if (id === undefined) id = this._repository.create(dto).id;
    else if (!this._repository.update({ id }, dto)) return null;
    this.changed$.next();
    const saved = this._repository.findOne({ id });
    return saved ? toWebhook(saved) : null;
  }

  setEnabled(id: number, enabled: boolean) {
    const dto: SetWebhookDisabledDto = { disabledAt: enabled ? null : new Date().toISOString() };
    if (this._repository.update({ id }, dto)) this.changed$.next();
  }

  delete(id: number) {
    if (this._repository.delete({ id })) this.changed$.next();
  }

  /** relay.env з workspace / DEST / room (до вебхуків у SQLite): переносимо relay один раз. Секрети лишаються там, де були. */
  private _importLegacyRelay() {
    if (this._repository.exists({ type: 'relay' }, { withDeleted: true })) return;
    const file = readEnvFile(process.env.MACONTROL_RELAY_ENV || LEGACY_RELAY_ENV_PATH);
    const pick = (name: string) => process.env[name] || file.get(name);
    const workspace = pick('WEBHOOXY_WORKSPACE');
    const destId = pick('WEBHOOXY_DEST_ID');
    const room = pick('WEBHOOXY_ROOM');
    if (!workspace || !destId || !room) return;
    const dto: SaveWebhookDto = { whId: generateWhId(), provider: 'macontrol', type: 'relay', mode: 'stream', workspace, destId, config: { room } };
    this._repository.create(dto);
    this._logger.log('relay webhook imported from relay.env');
  }
}
