import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class TrustedNetworksRepository {
  constructor(private readonly _database: DatabaseService) {}

  /** SSID у порядку додавання. */
  list(): string[] {
    return (this._database.db.prepare('SELECT ssid FROM trusted_networks ORDER BY added_at, ssid').all() as { ssid: string }[]).map(
      (row) => row.ssid,
    );
  }

  add(ssid: string, at: string): boolean {
    return Number(this._database.db.prepare('INSERT OR IGNORE INTO trusted_networks (ssid, added_at) VALUES (?, ?)').run(ssid, at).changes) > 0;
  }

  remove(ssid: string): boolean {
    return Number(this._database.db.prepare('DELETE FROM trusted_networks WHERE ssid = ?').run(ssid).changes) > 0;
  }
}
