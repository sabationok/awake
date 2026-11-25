// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { setEntityTable } from '../metadata/metadata-storage';

export function Entity(table: string): ClassDecorator {
  return (target) => setEntityTable(target, table);
}
