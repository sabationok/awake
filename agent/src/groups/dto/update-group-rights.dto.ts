import type { GroupBotRights } from '@awake/contracts';
import { GroupRefDto } from './group-ref.dto';

export class UpdateGroupRightsDto extends GroupRefDto {
  botRights!: GroupBotRights;
  /** Не задано — не міняти. */
  topicsEnabled?: boolean;
  title?: string;
}
