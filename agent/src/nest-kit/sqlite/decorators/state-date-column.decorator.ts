// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { defineColumn } from './column.decorator';

/**
 * Стан рядка як час події (`disabledAt`, `revokedAt`, `endedAt`), не bool. Поле — `<participle>At`;
 * query може фільтрувати похідним `<participle>?: boolean` → `IS [NOT] NULL`.
 */
export function StateDateColumn(name?: string): PropertyDecorator {
  return (target, property) => {
    if (!String(property).endsWith('At')) throw new Error(`${target.constructor.name}.${String(property)}: state column must be named <participle>At`);
    defineColumn({ type: 'text', name, nullable: true }, { role: 'state-date' })(target, property);
  };
}
