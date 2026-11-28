import type { SettingValue } from '@macontrol/contracts';
import { Column, Entity, PrimaryColumn } from '@nest-kit/sqlite';

/** Значення лежить як JSON, щоб bool і число не поверталися рядками. */
@Entity('settings')
export class SettingEntity {
  @PrimaryColumn({ type: 'text' }) module!: string;
  @PrimaryColumn({ type: 'text' }) key!: string;
  @Column({ type: 'json' }) value!: SettingValue;
}
