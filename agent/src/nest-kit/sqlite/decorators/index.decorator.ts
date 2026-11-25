// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { addIndexMeta } from '../metadata/metadata-storage';

/** Індекс для `schema:sql` і перевірки дрейфу; створює його міграція. */
export function Index(fields: string[], options: { unique?: boolean; name?: string } = {}): ClassDecorator {
  return (target) => addIndexMeta(target, { fields, unique: options.unique ?? false, name: options.name });
}
