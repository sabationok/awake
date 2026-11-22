import { Injectable } from '@nestjs/common';
import type { Webhook, WebhookConfig, WebhookMode, WebhookProvider, WebhookType } from '@awake/contracts';
import { DatabaseService } from '../../database/database.service';

interface WebhookRow {
  id: number;
  wh_id: string;
  provider: WebhookProvider;
  type: WebhookType;
  mode: WebhookMode;
  workspace: string;
  dest_id: string;
  config: string;
  created_at: string;
  updated_at: string | null;
  disabled_at: string | null;
}

const COLUMNS = 'id, wh_id, provider, type, mode, workspace, dest_id, config, created_at, updated_at, disabled_at';

function toWebhook(row: WebhookRow): Webhook {
  return {
    id: row.id,
    whId: row.wh_id,
    provider: row.provider,
    type: row.type,
    mode: row.mode,
    workspace: row.workspace,
    destId: row.dest_id,
    config: JSON.parse(row.config) as WebhookConfig,
    createdAt: row.created_at,
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
    ...(row.disabled_at ? { disabledAt: row.disabled_at } : {}),
  };
}

/** Вебхуки агента. Видалені (`deleted_at`) лишаються в таблиці, але не читаються. */
@Injectable()
export class WebhooksRepository {
  constructor(private readonly _database: DatabaseService) {}

  findMany(): Webhook[] {
    const rows = this._database.db.prepare(`SELECT ${COLUMNS} FROM webhooks WHERE deleted_at IS NULL ORDER BY created_at, id`).all();
    return (rows as unknown as WebhookRow[]).map(toWebhook);
  }

  findOne(id: number): Webhook | null {
    const row = this._database.db.prepare(`SELECT ${COLUMNS} FROM webhooks WHERE id = ? AND deleted_at IS NULL`).get(id);
    return row ? toWebhook(row as unknown as WebhookRow) : null;
  }

  create(data: Omit<Webhook, 'id' | 'updatedAt' | 'disabledAt'>): number {
    const result = this._database.db
      .prepare('INSERT INTO webhooks (wh_id, provider, type, mode, workspace, dest_id, config, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(data.whId, data.provider, data.type, data.mode, data.workspace, data.destId, JSON.stringify(data.config), data.createdAt);
    return Number(result.lastInsertRowid);
  }

  update(id: number, data: Pick<Webhook, 'whId' | 'provider' | 'type' | 'mode' | 'workspace' | 'destId' | 'config'>, at: string): boolean {
    const result = this._database.db
      .prepare(
        'UPDATE webhooks SET wh_id = ?, provider = ?, type = ?, mode = ?, workspace = ?, dest_id = ?, config = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      )
      .run(data.whId, data.provider, data.type, data.mode, data.workspace, data.destId, JSON.stringify(data.config), at, id);
    return Number(result.changes) > 0;
  }

  /** `disabledAt: null` — увімкнути. */
  setDisabledAt(id: number, disabledAt: string | null, at: string): boolean {
    const result = this._database.db
      .prepare('UPDATE webhooks SET disabled_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
      .run(disabledAt, at, id);
    return Number(result.changes) > 0;
  }

  /** Чи був такий тип хоч колись (разом із видаленими): старі ключі імпортуємо лише раз. */
  hasEverType(type: WebhookType): boolean {
    return !!this._database.db.prepare('SELECT 1 FROM webhooks WHERE type = ? LIMIT 1').get(type);
  }

  softDelete(id: number, at: string): boolean {
    return Number(this._database.db.prepare('UPDATE webhooks SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL').run(at, id).changes) > 0;
  }
}
