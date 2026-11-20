import { Injectable } from '@nestjs/common';
import type { SettingValue } from '@awake/contracts';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class SettingsRepository {
  constructor(private readonly _database: DatabaseService) {}

  /** Значення лежить як JSON, щоб bool і число не поверталися рядками. */
  get(module: string, key: string): SettingValue | undefined {
    const row = this._database.db
      .prepare('SELECT value FROM settings WHERE module = ? AND key = ?')
      .get(module, key) as unknown as { value: string } | undefined;
    return row ? (JSON.parse(row.value) as SettingValue) : undefined;
  }

  upsert(module: string, key: string, value: SettingValue) {
    this._database.db
      .prepare(
        'INSERT INTO settings (module, key, value) VALUES (?, ?, ?) ON CONFLICT (module, key) DO UPDATE SET value = excluded.value',
      )
      .run(module, key, JSON.stringify(value));
  }
}
