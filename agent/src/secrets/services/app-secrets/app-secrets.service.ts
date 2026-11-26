import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import type { SecretKeyInfo } from '@awake/contracts';
import { EnvifyService } from '../../../envify';
import { APP_SECRET_KEYS, type AppSecretField } from '../../constants/app-secret-keys';
import { readAppSecrets } from '../../helpers/read-app-secrets';
import { writeAppSecrets } from '../../helpers/write-app-secrets';

/** Глобальні секрети аппки з process.env / Envify / secrets.env. Значення лише в пам'яті агента. */
@Injectable()
export class AppSecretsService {
  /** Значення справді змінились: relay перепідключається, вебхуки переписують URL. */
  readonly changed$ = new Subject<void>();
  private _values: Partial<Record<AppSecretField, string>> = {};
  private _keys: SecretKeyInfo[] = [];

  constructor(private readonly _envify: EnvifyService) {
    this._read();
  }

  get(field: AppSecretField): string | null {
    return this._values[field] ?? null;
  }

  get keys(): SecretKeyInfo[] {
    return this._keys;
  }

  /** Імена секретів, яких немає ніде. */
  get missing(): string[] {
    return this._keys.filter((key) => key.source === null).map((key) => key.name);
  }

  /** Пише значення в secrets.env на цьому Mac (основні імена) і перечитує. Порожні значення не пишуться. */
  save(updates: ReadonlyMap<AppSecretField, string>): boolean {
    const byName = new Map<string, string>();
    for (const [field, value] of updates) {
      const trimmed = value.trim();
      if (trimmed) byName.set(APP_SECRET_KEYS[field][0], trimmed);
    }
    if (byName.size === 0) return false;
    writeAppSecrets(byName);
    return this.reload();
  }

  /** Перечитати. `changed$` — лише коли змінились значення, а не просто оновився Envify. */
  reload(): boolean {
    const before = JSON.stringify(this._values);
    this._read();
    const changed = JSON.stringify(this._values) !== before;
    if (changed) this.changed$.next();
    return changed;
  }

  private _read() {
    const read = readAppSecrets(this._envify.variables);
    this._values = read.values;
    this._keys = read.keys;
  }
}
